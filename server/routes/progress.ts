import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { mergeLegacyProgress, progressFromProfile } from "../game/progress.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { ensureProfile, getProgress, resetProgress } from "../services/profile.js";

export const progressRouter = Router();

const statsSchema = z.record(
  z.object({
    attempts: z.number().int().nonnegative().max(100000),
    correct: z.number().int().nonnegative().max(100000)
  })
);

const legacyProgressSchema = z.object({
  totalAttempts: z.number().int().nonnegative().max(100000).optional(),
  totalCorrect: z.number().int().nonnegative().max(100000).optional(),
  bugsFixed: z.number().int().nonnegative().max(100000).optional(),
  totalXP: z.number().int().nonnegative().max(10000000).optional(),
  timeSpentSeconds: z.number().int().nonnegative().max(315360000).optional(),
  currentStreak: z.number().int().nonnegative().max(100000).optional(),
  bestStreak: z.number().int().nonnegative().max(100000).optional(),
  sessionsPlayed: z.number().int().nonnegative().max(100000).optional(),
  badges: z.array(z.string().max(64)).max(100).optional(),
  topicStats: statsSchema.optional(),
  difficultyStats: statsSchema.optional(),
  languageStats: statsSchema.optional()
});

progressRouter.get(
  "/api/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const progress = await getProgress(prisma, currentUserId(req));
    res.json({ data: { progress } });
  })
);

progressRouter.post(
  "/api/progress/migrate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const legacy = legacyProgressSchema.parse(req.body);
    const profile = await ensureProfile(prisma, userId);

    if (profile.migratedLocalProgressAt) {
      const progress = await getProgress(prisma, userId);
      res.json({ data: { migrated: false, progress } });
      return;
    }

    const current = progressFromProfile(profile);
    const merged = mergeLegacyProgress(current, legacy);

    await prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { userId },
        data: {
          totalAttempts: merged.totalAttempts,
          totalCorrect: merged.totalCorrect,
          bugsFixed: merged.bugsFixed,
          totalXP: merged.totalXP,
          timeSpentSeconds: merged.timeSpentSeconds,
          currentStreak: merged.currentStreak,
          bestStreak: merged.bestStreak,
          sessionsPlayed: merged.sessionsPlayed,
          topicStats: merged.topicStats,
          difficultyStats: merged.difficultyStats,
          languageStats: merged.languageStats,
          migratedLocalProgressAt: new Date()
        }
      });

      for (const code of merged.badges) {
        await tx.achievement.upsert({
          where: { userId_code: { userId, code } },
          create: { userId, code, label: code },
          update: {}
        });
      }
    });

    const progress = await getProgress(prisma, userId);
    res.json({ data: { migrated: true, progress } });
  })
);

progressRouter.delete(
  "/api/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const activeSession = await prisma.gameSession.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      select: { id: true }
    });

    if (activeSession) {
      throw new HttpError(409, "Finish or abandon the active run before resetting progress.", "active_session");
    }

    const progress = await resetProgress(prisma, userId);
    res.json({ data: { progress } });
  })
);
