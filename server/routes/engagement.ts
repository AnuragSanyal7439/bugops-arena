import { Router } from "express";
import { prisma } from "../db.js";
import {
  buildChallengePlan,
  buildWeeklyQuests,
  getWeekStart,
  serializeTrack,
  trackDefinitions
} from "../game/engagement.js";
import { toDifficultyLabel } from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler } from "../http/errors.js";
import { recordAnalyticsEvent } from "../services/analytics.js";

export const engagementRouter = Router();

engagementRouter.get(
  "/api/engagement",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const now = new Date();
    const [dailyBug, weeklyQuests] = await Promise.all([getDailyBug(now), getWeeklyQuests(userId, now)]);

    await recordAnalyticsEvent(prisma, {
      userId,
      eventName: "engagement_viewed",
      properties: { surface: "engagement_summary" }
    }).catch(() => undefined);

    res.json({
      data: {
        dailyBug,
        weeklyQuests,
        tracks: trackDefinitions.map(serializeTrack),
        modes: [
          {
            id: "placement_prep",
            label: "Placement Preparation",
            description: "Mixed interview-style debugging across common placement topics."
          },
          {
            id: "no_hint",
            label: "No-Hint Mode",
            description: "Hints are blocked by the server for clean-room practice."
          },
          {
            id: "boss",
            label: "Boss Challenges",
            description: "Short hard-mode sets for advanced pressure testing."
          }
        ]
      }
    });
  })
);

async function getDailyBug(now: Date) {
  const challenges = await prisma.challenge.findMany({
    orderBy: { id: "asc" },
    select: { id: true, title: true, language: true, difficulty: true, topic: true }
  });
  const plan = buildChallengePlan({ selectedDifficulty: "All", mode: "daily_bug" }, challenges, now);
  const challenge = challenges.find((candidate) => candidate.id === plan.challengeIds[0]);

  return challenge
    ? {
        id: challenge.id,
        title: challenge.title,
        language: challenge.language,
        difficulty: toDifficultyLabel(challenge.difficulty),
        topic: challenge.topic,
        engagementKey: plan.engagementKey
      }
    : null;
}

async function getWeeklyQuests(userId: string, now: Date) {
  const weekStart = getWeekStart(now);
  const [submissions, noHintCompletions, bossCompletions] = await Promise.all([
    prisma.submission.findMany({
      where: { userId, createdAt: { gte: weekStart } },
      include: { challenge: { select: { language: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.gameSession.count({
      where: {
        userId,
        noHintMode: true,
        hintsUsed: 0,
        status: { in: ["COMPLETED", "LOCKED"] },
        finishedAt: { gte: weekStart }
      }
    }),
    prisma.gameSession.count({
      where: {
        userId,
        bossChallenge: true,
        status: { in: ["COMPLETED", "LOCKED"] },
        finishedAt: { gte: weekStart }
      }
    })
  ]);

  return buildWeeklyQuests({
    weeklySubmissionCount: submissions.length,
    weeklyCorrectCount: submissions.filter((submission) => submission.isCorrect).length,
    weeklyNoHintCompletions: noHintCompletions,
    weeklyBossCompletions: bossCompletions,
    weeklyLanguagesSolved: new Set(
      submissions.filter((submission) => submission.isCorrect).map((submission) => submission.challenge.language)
    ).size
  });
}
