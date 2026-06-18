import type { Prisma, PrismaClient, Profile } from "@prisma/client";
import {
  type ProgressShape,
  applySubmissionToProgress,
  initialProgress,
  progressFromProfile,
  unlockedAchievements
} from "../game/progress.js";

export async function ensureProfile(prisma: PrismaClient, userId: string): Promise<Profile> {
  return prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
}

export async function getProgress(prisma: PrismaClient, userId: string): Promise<ProgressShape> {
  const [profile, achievements] = await Promise.all([
    ensureProfile(prisma, userId),
    prisma.achievement.findMany({
      where: { userId },
      select: { code: true },
      orderBy: { unlockedAt: "asc" }
    })
  ]);

  return progressFromProfile(
    profile,
    achievements.map((achievement) => achievement.code)
  );
}

export async function resetProgress(prisma: PrismaClient, userId: string): Promise<ProgressShape> {
  await prisma.$transaction([
    prisma.achievement.deleteMany({ where: { userId } }),
    prisma.profile.upsert({
      where: { userId },
      create: { userId },
      update: {
        totalAttempts: 0,
        totalCorrect: 0,
        bugsFixed: 0,
        totalXP: 0,
        timeSpentSeconds: 0,
        currentStreak: 0,
        bestStreak: 0,
        sessionsPlayed: 0,
        topicStats: {},
        difficultyStats: {},
        languageStats: {}
      }
    })
  ]);

  return { ...initialProgress };
}

export async function recordSubmissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  input: {
    isCorrect: boolean;
    xpAwarded: number;
    topic: string;
    difficulty: string;
    language: string;
  }
): Promise<ProgressShape> {
  const [profile, achievements] = await Promise.all([
    tx.profile.upsert({
      where: { userId },
      create: { userId },
      update: {}
    }),
    tx.achievement.findMany({
      where: { userId },
      select: { code: true },
      orderBy: { unlockedAt: "asc" }
    })
  ]);
  const current = progressFromProfile(
    profile,
    achievements.map((achievement) => achievement.code)
  );
  const next = applySubmissionToProgress(current, input);

  await tx.profile.update({
    where: { userId },
    data: {
      totalAttempts: next.totalAttempts,
      totalCorrect: next.totalCorrect,
      bugsFixed: next.bugsFixed,
      totalXP: next.totalXP,
      currentStreak: next.currentStreak,
      bestStreak: next.bestStreak,
      topicStats: next.topicStats,
      difficultyStats: next.difficultyStats,
      languageStats: next.languageStats
    }
  });

  const newlyUnlocked = unlockedAchievements(
    next,
    achievements.map((achievement) => achievement.code)
  );

  for (const achievement of newlyUnlocked) {
    await tx.achievement.upsert({
      where: {
        userId_code: {
          userId,
          code: achievement.code
        }
      },
      create: {
        userId,
        code: achievement.code,
        label: achievement.label
      },
      update: {}
    });
  }

  next.badges = Array.from(new Set([...next.badges, ...newlyUnlocked.map((achievement) => achievement.code)]));
  return next;
}
