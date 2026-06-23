import type { Profile } from "@prisma/client";

export type StatBucket = Record<string, { attempts: number; correct: number }>;

export type ProgressShape = {
  totalAttempts: number;
  totalCorrect: number;
  bugsFixed: number;
  totalXP: number;
  timeSpentSeconds: number;
  currentStreak: number;
  bestStreak: number;
  sessionsPlayed: number;
  badges: string[];
  topicStats: StatBucket;
  difficultyStats: StatBucket;
  languageStats: StatBucket;
};

export const initialProgress: ProgressShape = {
  totalAttempts: 0,
  totalCorrect: 0,
  bugsFixed: 0,
  totalXP: 0,
  timeSpentSeconds: 0,
  currentStreak: 0,
  bestStreak: 0,
  sessionsPlayed: 0,
  badges: [],
  topicStats: {},
  difficultyStats: {},
  languageStats: {}
};

export const achievementRules = [
  { code: "first-fix", label: "First Fix", test: (progress: ProgressShape) => progress.bugsFixed >= 1 },
  { code: "streak-3", label: "Hot Streak", test: (progress: ProgressShape) => progress.bestStreak >= 3 },
  { code: "xp-250", label: "XP Surge", test: (progress: ProgressShape) => progress.totalXP >= 250 },
  {
    code: "polyglot",
    label: "Polyglot",
    test: (progress: ProgressShape) =>
      Object.values(progress.languageStats).filter((stats) => stats.correct > 0).length >= 4
  },
  {
    code: "hard-mode",
    label: "Hard Mode",
    test: (progress: ProgressShape) => (progress.difficultyStats.Hard?.correct || 0) >= 2
  },
  {
    code: "bug-surgeon",
    label: "Bug Surgeon",
    test: (progress: ProgressShape) => progress.bugsFixed >= 25
  },
  {
    code: "accuracy-80",
    label: "Precision Debugger",
    test: (progress: ProgressShape) => progress.totalAttempts >= 10 && progress.totalCorrect / progress.totalAttempts >= 0.8
  },
  {
    code: "xp-1000",
    label: "Kilobyte Climber",
    test: (progress: ProgressShape) => progress.totalXP >= 1000
  },
  {
    code: "language-specialist",
    label: "Language Specialist",
    test: (progress: ProgressShape) => Object.values(progress.languageStats).some((stats) => stats.correct >= 8)
  },
  {
    code: "topic-master",
    label: "Topic Master",
    test: (progress: ProgressShape) => Object.values(progress.topicStats).some((stats) => stats.attempts >= 8 && stats.correct / stats.attempts >= 0.85)
  }
];

export function normalizeStats(value: unknown): StatBucket {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<StatBucket>((bucket, [key, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bucket;
    const candidate = raw as { attempts?: unknown; correct?: unknown };
    const attempts = Number(candidate.attempts || 0);
    const correct = Number(candidate.correct || 0);
    bucket[key] = {
      attempts: Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0,
      correct: Number.isFinite(correct) && correct > 0 ? Math.floor(correct) : 0
    };
    return bucket;
  }, {});
}

export function progressFromProfile(profile: Profile, badges: string[] = []): ProgressShape {
  return {
    totalAttempts: profile.totalAttempts,
    totalCorrect: profile.totalCorrect,
    bugsFixed: profile.bugsFixed,
    totalXP: profile.totalXP,
    timeSpentSeconds: profile.timeSpentSeconds,
    currentStreak: profile.currentStreak,
    bestStreak: profile.bestStreak,
    sessionsPlayed: profile.sessionsPlayed,
    badges,
    topicStats: normalizeStats(profile.topicStats),
    difficultyStats: normalizeStats(profile.difficultyStats),
    languageStats: normalizeStats(profile.languageStats)
  };
}

export function bumpStats(bucket: StatBucket, key: string, isCorrect: boolean): StatBucket {
  const next = { ...bucket };
  const current = next[key] || { attempts: 0, correct: 0 };
  next[key] = {
    attempts: current.attempts + 1,
    correct: current.correct + (isCorrect ? 1 : 0)
  };
  return next;
}

export function applySubmissionToProgress(
  progress: ProgressShape,
  input: {
    isCorrect: boolean;
    xpAwarded: number;
    topic: string;
    difficulty: string;
    language: string;
  }
): ProgressShape {
  const next: ProgressShape = {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    totalXP: progress.totalXP + input.xpAwarded,
    topicStats: bumpStats(progress.topicStats, input.topic, input.isCorrect),
    difficultyStats: bumpStats(progress.difficultyStats, input.difficulty, input.isCorrect),
    languageStats: bumpStats(progress.languageStats, input.language, input.isCorrect)
  };

  if (input.isCorrect) {
    next.totalCorrect += 1;
    next.bugsFixed += 1;
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
  } else {
    next.currentStreak = 0;
  }

  return next;
}

export function unlockedAchievements(progress: ProgressShape, existingCodes: string[]): Array<{ code: string; label: string }> {
  const existing = new Set(existingCodes);
  return achievementRules
    .filter((rule) => !existing.has(rule.code) && rule.test(progress))
    .map((rule) => ({ code: rule.code, label: rule.label }));
}

export function mergeLegacyProgress(current: ProgressShape, legacy: Partial<ProgressShape>): ProgressShape {
  const legacyStats = {
    topicStats: normalizeStats(legacy.topicStats),
    difficultyStats: normalizeStats(legacy.difficultyStats),
    languageStats: normalizeStats(legacy.languageStats)
  };

  return {
    ...current,
    totalAttempts: Math.max(current.totalAttempts, Number(legacy.totalAttempts || 0)),
    totalCorrect: Math.max(current.totalCorrect, Number(legacy.totalCorrect || 0)),
    bugsFixed: Math.max(current.bugsFixed, Number(legacy.bugsFixed || 0)),
    totalXP: Math.max(current.totalXP, Number(legacy.totalXP || 0)),
    timeSpentSeconds: Math.max(current.timeSpentSeconds, Number(legacy.timeSpentSeconds || 0)),
    currentStreak: Math.max(current.currentStreak, Number(legacy.currentStreak || 0)),
    bestStreak: Math.max(current.bestStreak, Number(legacy.bestStreak || 0)),
    sessionsPlayed: Math.max(current.sessionsPlayed, Number(legacy.sessionsPlayed || 0)),
    badges: Array.from(new Set([...(current.badges || []), ...((legacy.badges as string[] | undefined) || [])])),
    topicStats: mergeStatBuckets(current.topicStats, legacyStats.topicStats),
    difficultyStats: mergeStatBuckets(current.difficultyStats, legacyStats.difficultyStats),
    languageStats: mergeStatBuckets(current.languageStats, legacyStats.languageStats)
  };
}

function mergeStatBuckets(current: StatBucket, legacy: StatBucket): StatBucket {
  const next = { ...current };
  for (const [key, stats] of Object.entries(legacy)) {
    const existing = next[key] || { attempts: 0, correct: 0 };
    next[key] = {
      attempts: Math.max(existing.attempts, stats.attempts),
      correct: Math.max(existing.correct, stats.correct)
    };
  }
  return next;
}
