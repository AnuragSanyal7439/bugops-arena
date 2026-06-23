import { Router } from "express";
import { prisma } from "../db.js";
import { buildAdaptiveRecommendations, buildSkillMastery } from "../game/recommendations.js";
import { progressFromProfile } from "../game/progress.js";
import { toDifficultyLabel } from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler } from "../http/errors.js";
import { recordAnalyticsEvent } from "../services/analytics.js";
import { ensureProfile } from "../services/profile.js";

export const profileRouter = Router();

profileRouter.get(
  "/api/profile/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const [user, profile, achievements] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } }),
      ensureProfile(prisma, userId),
      prisma.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: "desc" },
        select: { code: true, label: true, unlockedAt: true }
      })
    ]);

    await recordAnalyticsEvent(prisma, {
      userId,
      eventName: "profile_viewed",
      properties: { surface: "profile_summary" }
    }).catch(() => undefined);

    res.json({
      data: {
        user,
        profile: progressFromProfile(profile, achievements.map((achievement) => achievement.code)),
        achievements
      }
    });
  })
);

profileRouter.get(
  "/api/profile/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const submissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        isCorrect: true,
        scoreAwarded: true,
        xpAwarded: true,
        timeLeftSeconds: true,
        hintsUsed: true,
        createdAt: true,
        challenge: {
          select: {
            id: true,
            title: true,
            language: true,
            difficulty: true,
            topic: true
          }
        },
        gameSession: {
          select: {
            mode: true,
            trackId: true,
            noHintMode: true,
            bossChallenge: true
          }
        }
      }
    });

    res.json({
      data: {
        history: submissions.map((submission) => ({
          id: submission.id,
          challengeId: submission.challenge.id,
          title: submission.challenge.title,
          language: submission.challenge.language,
          difficulty: toDifficultyLabel(submission.challenge.difficulty),
          topic: submission.challenge.topic,
          isCorrect: submission.isCorrect,
          scoreAwarded: submission.scoreAwarded,
          xpAwarded: submission.xpAwarded,
          timeLeftSeconds: submission.timeLeftSeconds,
          hintsUsed: submission.hintsUsed,
          mode: submission.gameSession?.mode || "standard",
          trackId: submission.gameSession?.trackId || null,
          noHintMode: submission.gameSession?.noHintMode || false,
          bossChallenge: submission.gameSession?.bossChallenge || false,
          createdAt: submission.createdAt
        }))
      }
    });
  })
);

profileRouter.get(
  "/api/profile/mastery",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const [profile, achievements, recentSubmissions] = await Promise.all([
      ensureProfile(prisma, userId),
      prisma.achievement.findMany({ where: { userId }, select: { code: true } }),
      prisma.submission.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          isCorrect: true,
          hintsUsed: true,
          timeLeftSeconds: true,
          challenge: {
            select: {
              topic: true,
              language: true,
              difficulty: true
            }
          }
        }
      })
    ]);
    const progress = progressFromProfile(profile, achievements.map((achievement) => achievement.code));

    res.json({
      data: {
        mastery: buildSkillMastery(progress),
        recommendations: buildAdaptiveRecommendations(
          progress,
          recentSubmissions.map((submission) => ({
            isCorrect: submission.isCorrect,
            hintsUsed: submission.hintsUsed,
            timeLeftSeconds: submission.timeLeftSeconds,
            challenge: submission.challenge
          }))
        )
      }
    });
  })
);
