import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { maskHiddenExecutionResult, parseWorkspaceTestCases, runChallengeTests } from "../execution/index.js";
import { toDifficultyLabel } from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { recordAnalyticsEvent } from "../services/analytics.js";

export const workspaceRouter = Router();

export const runTestsSchema = z
  .object({
    gameSessionId: z.string().uuid(),
    code: z.string().min(1).max(50000)
  })
  .strict();

workspaceRouter.get(
  "/api/workspace/game-sessions/:id/current",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const context = await getWorkspaceContext(String(req.params.id), userId);

    res.json({
      data: {
        challenge: serializeWorkspaceChallenge(context.challenge, context.activeVersion, context.session.status !== "IN_PROGRESS")
      }
    });
  })
);

workspaceRouter.post(
  "/api/workspace/run-tests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = runTestsSchema.parse(req.body);
    const context = await getWorkspaceContext(body.gameSessionId, userId);

    if (context.session.status !== "IN_PROGRESS") {
      throw new HttpError(409, "Tests can only run during an active session.", "session_closed");
    }

    const result = await runChallengeTests({
      challengeId: context.challenge.id,
      language: context.challenge.language,
      code: body.code,
      buggyCode: context.activeVersion.buggyCode,
      correctFix: context.activeVersion.correctFix,
      testCases: parseWorkspaceTestCases(context.activeVersion.testCases)
    });

    await recordAnalyticsEvent(prisma, {
      userId,
      gameSessionId: context.session.id,
      eventName: "tests_run",
      properties: {
        mode: context.session.mode,
        trackId: context.session.trackId || "none",
        language: context.challenge.language,
        challengeId: context.challenge.id,
        provider: result.provider,
        passed: result.passed,
        visiblePassed: result.visiblePassed,
        visibleTotal: result.visibleTotal,
        hiddenPassed: result.hiddenPassed,
        hiddenTotal: result.hiddenTotal,
        durationMs: result.durationMs
      }
    }).catch(() => undefined);

    res.json({
      data: {
        run: maskHiddenExecutionResult(result, false)
      }
    });
  })
);

async function getWorkspaceContext(gameSessionId: string, userId: string) {
  const session = await prisma.gameSession.findFirst({
    where: { id: gameSessionId, userId }
  });

  if (!session) {
    throw new HttpError(404, "Game session not found.", "session_not_found");
  }

  const challengeId = session.challengeIds[session.currentChallengeIndex];
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

  return { session, challenge, activeVersion };
}

function serializeWorkspaceChallenge(
  challenge: Awaited<ReturnType<typeof getWorkspaceContext>>["challenge"],
  activeVersion: Awaited<ReturnType<typeof getWorkspaceContext>>["activeVersion"],
  revealCompletionDetails: boolean
) {
  const tests = parseWorkspaceTestCases(activeVersion.testCases);
  const visibleTests = tests.filter((test) => test.visibility === "visible");
  const hiddenTests = tests.filter((test) => test.visibility === "hidden");
  const hints = Array.isArray(activeVersion.hints) ? activeVersion.hints.filter((hint) => typeof hint === "string") : [];

  return {
    id: challenge.id,
    title: challenge.title,
    language: challenge.language,
    difficulty: toDifficultyLabel(challenge.difficulty),
    topic: challenge.topic,
    starterCode: activeVersion.buggyCode,
    visibleTests: visibleTests.map((test) => ({
      id: test.id,
      name: test.name,
      input: test.input || test.expression || "",
      expected: test.expected
    })),
    hiddenTests: hiddenTests.map((test) => ({
      id: test.id,
      name: revealCompletionDetails ? test.name : "Hidden validation",
      expected: revealCompletionDetails ? test.expected : "Hidden until completion."
    })),
    hiddenTestCount: hiddenTests.length,
    hintsAvailable: Math.max(5, hints.length),
    rootCause: revealCompletionDetails ? activeVersion.rootCause || activeVersion.explanation : null
  };
}
