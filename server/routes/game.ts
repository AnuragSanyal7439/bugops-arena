import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { maskHiddenExecutionResult, parseWorkspaceTestCases, runChallengeTests } from "../execution/index.js";
import { buildChallengePlan, engagementAchievementCandidates, engagementModes } from "../game/engagement.js";
import {
  applyOutcomeToSession,
  calculateServerSubmissionOutcome,
  getAccuracy,
  getHintCount,
  toDifficultyLabel
} from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { recordAnalyticsEvent } from "../services/analytics.js";
import { getProgress, recordSubmissionProgress } from "../services/profile.js";

export const gameRouter = Router();

export const createSessionSchema = z
  .object({
    selectedDifficulty: z.enum(["All", "Easy", "Medium", "Hard"]),
    mode: z.enum(engagementModes).default("standard"),
    trackId: z.string().trim().max(64).optional()
  })
  .strict();

export const submissionSchema = z
  .object({
    gameSessionId: z.string().uuid(),
    answer: z.string().min(1).max(20000)
  })
  .strict();

gameRouter.post(
  "/api/game-sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = createSessionSchema.parse(req.body);
    const challenges = await prisma.challenge.findMany({
      orderBy: { id: "asc" },
      select: { id: true, title: true, language: true, difficulty: true, topic: true }
    });
    const plan = buildChallengePlan(body, challenges);

    if (!plan.challengeIds.length) {
      throw new HttpError(404, "No challenges are available for this difficulty.", "no_challenges");
    }

    const now = new Date();
    const session = await prisma.gameSession.create({
      data: {
        userId,
        selectedDifficulty: body.selectedDifficulty,
        mode: plan.mode,
        trackId: plan.trackId,
        engagementKey: plan.engagementKey,
        noHintMode: plan.noHintMode,
        bossChallenge: plan.bossChallenge,
        challengeIds: plan.challengeIds,
        startedAt: now,
        currentChallengeStartedAt: now
      }
    });

    await recordAnalyticsEvent(prisma, {
      userId,
      gameSessionId: session.id,
      eventName: "session_started",
      properties: {
        mode: plan.mode,
        trackId: plan.trackId || "none",
        selectedDifficulty: body.selectedDifficulty,
        challengeCount: plan.challengeIds.length,
        noHintMode: plan.noHintMode,
        bossChallenge: plan.bossChallenge
      }
    }).catch(() => undefined);

    res.status(201).json({ data: { session: serializeGameSession(session) } });
  })
);

gameRouter.post(
  "/api/submissions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = submissionSchema.parse(req.body);
    const preflight = await getSubmissionContext(body.gameSessionId, userId);

    if (preflight.gameSession.status !== "IN_PROGRESS") {
      throw new HttpError(409, "Cannot submit to a finished game session.", "session_closed");
    }

    const execution = await runChallengeTests({
      challengeId: preflight.challenge.id,
      language: preflight.challenge.language,
      code: body.answer,
      buggyCode: preflight.activeVersion.buggyCode,
      correctFix: preflight.activeVersion.correctFix,
      testCases: parseWorkspaceTestCases(preflight.activeVersion.testCases)
    });
    const submittedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const gameSession = await tx.gameSession.findFirst({
        where: { id: body.gameSessionId, userId }
      });

      if (!gameSession) {
        throw new HttpError(404, "Game session not found.", "session_not_found");
      }

      await tx.$executeRaw`SELECT 1 FROM "GameSession" WHERE "id" = ${gameSession.id}::uuid FOR UPDATE`;

      if (gameSession.status !== "IN_PROGRESS") {
        throw new HttpError(409, "Cannot submit to a finished game session.", "session_closed");
      }

      const challengeId = gameSession.challengeIds[gameSession.currentChallengeIndex];
      if (!challengeId) {
        throw new HttpError(409, "No active challenge exists for this session.", "no_active_challenge");
      }

      if (challengeId !== preflight.challenge.id) {
        throw new HttpError(409, "Challenge advanced before this submission completed.", "stale_submission");
      }

      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: {
          versions: {
            where: { isActive: true },
            orderBy: { version: "desc" },
            take: 1
          }
        }
      });

      const activeVersion = challenge?.versions[0];
      if (!challenge || !activeVersion) {
        throw new HttpError(404, "Active challenge not found.", "challenge_not_found");
      }

      if (activeVersion.id !== preflight.activeVersion.id) {
        throw new HttpError(409, "Challenge version changed before this submission completed.", "stale_submission");
      }

      const hintsForChallenge = getHintCount(gameSession.hintCounts, challenge.id);
      const outcome = calculateServerSubmissionOutcome({
        challenge: {
          id: challenge.id,
          language: challenge.language,
          topic: challenge.topic,
          difficulty: challenge.difficulty,
          activeVersion
        },
        answer: body.answer,
        challengeStartedAt: gameSession.currentChallengeStartedAt,
        submittedAt,
        hintsUsedForChallenge: hintsForChallenge,
        verifiedCorrect: execution.passed
      });
      const nextSessionState = applyOutcomeToSession(
        {
          score: gameSession.score,
          xp: gameSession.xp,
          correct: gameSession.correct,
          attempts: gameSession.attempts,
          lives: gameSession.lives,
          streak: gameSession.streak,
          currentChallengeIndex: gameSession.currentChallengeIndex,
          challengeCount: gameSession.challengeIds.length
        },
        outcome
      );
      const isTerminal = nextSessionState.status !== "IN_PROGRESS";
      const shouldAdvance = outcome.isCorrect || outcome.timedOut;
      const timeSpentSeconds = isTerminal
        ? Math.max(1, Math.floor((submittedAt.getTime() - gameSession.startedAt.getTime()) / 1000))
        : gameSession.timeSpentSeconds;

      const submission = await tx.submission.create({
        data: {
          userId,
          gameSessionId: gameSession.id,
          challengeId: challenge.id,
          challengeVersionId: activeVersion.id,
          submittedAnswer: body.answer,
          isCorrect: outcome.isCorrect,
          scoreAwarded: outcome.scoreAwarded,
          xpAwarded: outcome.xpAwarded,
          timeLeftSeconds: outcome.timeLeftSeconds,
          hintsUsed: hintsForChallenge,
          testResults: execution.results as unknown as Prisma.InputJsonValue,
          consoleOutput: execution.consoleOutput.join("\n").slice(0, 5000),
          compilerOutput: execution.compilerOutput.slice(0, 5000)
        }
      });

      const updatedSession = await tx.gameSession.update({
        where: { id: gameSession.id },
        data: {
          score: nextSessionState.score,
          xp: nextSessionState.xp,
          correct: nextSessionState.correct,
          attempts: nextSessionState.attempts,
          lives: nextSessionState.lives,
          streak: nextSessionState.streak,
          currentChallengeIndex: nextSessionState.currentChallengeIndex,
          currentChallengeStartedAt:
            shouldAdvance && nextSessionState.status === "IN_PROGRESS"
              ? submittedAt
              : gameSession.currentChallengeStartedAt,
          status: nextSessionState.status,
          finishedAt: isTerminal ? submittedAt : null,
          timeSpentSeconds
        }
      });

      const progress = await recordSubmissionProgress(tx, userId, {
        isCorrect: outcome.isCorrect,
        xpAwarded: outcome.xpAwarded,
        topic: challenge.topic,
        difficulty: toDifficultyLabel(challenge.difficulty),
        language: challenge.language
      });

      if (isTerminal) {
        await tx.profile.update({
          where: { userId },
          data: {
            sessionsPlayed: { increment: 1 },
            timeSpentSeconds: { increment: timeSpentSeconds }
          }
        });
        progress.sessionsPlayed += 1;
        progress.timeSpentSeconds += timeSpentSeconds;
      }

      const sessionCompleted = updatedSession.status === "COMPLETED" || updatedSession.status === "LOCKED";
      const extraAchievements = engagementAchievementCandidates({
        mode: updatedSession.mode,
        noHintMode: updatedSession.noHintMode,
        bossChallenge: updatedSession.bossChallenge,
        sessionCompleted,
        sessionHintsUsed: updatedSession.hintsUsed,
        totalCorrect: progress.totalCorrect,
        totalXP: progress.totalXP,
        weeklyQuestsCompleted: 0
      });

      for (const achievement of extraAchievements) {
        await tx.achievement.upsert({
          where: { userId_code: { userId, code: achievement.code } },
          create: { userId, code: achievement.code, label: achievement.label },
          update: {}
        });
      }
      progress.badges = Array.from(new Set([...progress.badges, ...extraAchievements.map((achievement) => achievement.code)]));

      await recordAnalyticsEvent(tx, {
        userId,
        gameSessionId: gameSession.id,
        eventName: "submission_recorded",
        properties: {
          mode: updatedSession.mode,
          trackId: updatedSession.trackId || "none",
          challengeId: challenge.id,
          language: challenge.language,
          topic: challenge.topic,
          difficulty: toDifficultyLabel(challenge.difficulty),
          correct: outcome.isCorrect,
          hintsUsed: hintsForChallenge,
          timeLeftSeconds: outcome.timeLeftSeconds,
          provider: execution.provider
        }
      }).catch(() => undefined);

      return {
        session: serializeGameSession(updatedSession),
        submission,
        progress,
        outcome,
        execution: maskHiddenExecutionResult(execution, outcome.isCorrect || isTerminal),
        rootCause: outcome.isCorrect || isTerminal ? activeVersion.rootCause || activeVersion.explanation : null,
        currentChallengeId: challenge.id,
        nextChallengeId:
          updatedSession.status === "IN_PROGRESS"
            ? updatedSession.challengeIds[updatedSession.currentChallengeIndex]
            : null
      };
    });

    res.status(201).json({ data: result });
  })
);

gameRouter.patch(
  "/api/game-sessions/:id/finish",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const session = await prisma.gameSession.findFirst({
      where: { id: String(req.params.id), userId }
    });

    if (!session) {
      throw new HttpError(404, "Game session not found.", "session_not_found");
    }

    if (session.status === "IN_PROGRESS") {
      throw new HttpError(409, "Completion is derived from server-validated submissions.", "server_authoritative");
    }

    const progress = await getProgress(prisma, userId);
    res.json({
      data: {
        session: serializeGameSession(session),
        progress,
        accuracy: getAccuracy(session.correct, session.attempts)
      }
    });
  })
);

function serializeGameSession(session: {
  id: string;
  selectedDifficulty: string;
  mode: string;
  trackId: string | null;
  engagementKey: string | null;
  noHintMode: boolean;
  bossChallenge: boolean;
  status: string;
  score: number;
  xp: number;
  correct: number;
  attempts: number;
  hintsUsed: number;
  lives: number;
  streak: number;
  currentChallengeIndex: number;
  challengeIds: number[];
  startedAt: Date;
  finishedAt: Date | null;
  timeSpentSeconds: number;
}) {
  return {
    id: session.id,
    selectedDifficulty: session.selectedDifficulty,
    mode: session.mode,
    trackId: session.trackId,
    engagementKey: session.engagementKey,
    noHintMode: session.noHintMode,
    bossChallenge: session.bossChallenge,
    status: session.status,
    score: session.score,
    xp: session.xp,
    correct: session.correct,
    attempts: session.attempts,
    hintsUsed: session.hintsUsed,
    lives: session.lives,
    streak: session.streak,
    currentChallengeIndex: session.currentChallengeIndex,
    challengeIds: session.challengeIds,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    timeSpentSeconds: session.timeSpentSeconds
  };
}

async function getSubmissionContext(gameSessionId: string, userId: string) {
  const gameSession = await prisma.gameSession.findFirst({
    where: { id: gameSessionId, userId }
  });

  if (!gameSession) {
    throw new HttpError(404, "Game session not found.", "session_not_found");
  }

  const challengeId = gameSession.challengeIds[gameSession.currentChallengeIndex];
  if (!challengeId) {
    throw new HttpError(409, "No active challenge exists for this session.", "no_active_challenge");
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      versions: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1
      }
    }
  });

  const activeVersion = challenge?.versions[0];
  if (!challenge || !activeVersion) {
    throw new HttpError(404, "Active challenge not found.", "challenge_not_found");
  }

  return { gameSession, challenge, activeVersion };
}
