import type { Challenge, ChallengeVersion } from "@prisma/client";

export const difficultyPoints = {
  Easy: { seconds: 60, xp: 40, score: 100 },
  Medium: { seconds: 75, xp: 70, score: 160 },
  Hard: { seconds: 90, xp: 110, score: 240 }
} as const;

export type DifficultyLabel = keyof typeof difficultyPoints;

export type ChallengeForScoring = Pick<Challenge, "id" | "language" | "topic"> & {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  activeVersion: Pick<ChallengeVersion, "id" | "correctFix" | "buggyCode">;
};

export type ServerSubmissionOutcome = {
  isCorrect: boolean;
  timedOut: boolean;
  scoreAwarded: number;
  xpAwarded: number;
  timeLeftSeconds: number;
};

export type SessionStateForOutcome = {
  score: number;
  xp: number;
  correct: number;
  attempts: number;
  lives: number;
  streak: number;
  currentChallengeIndex: number;
  challengeCount: number;
};

export type NextSessionState = {
  score: number;
  xp: number;
  correct: number;
  attempts: number;
  lives: number;
  streak: number;
  currentChallengeIndex: number;
  status: "IN_PROGRESS" | "COMPLETED" | "LOCKED";
};

export function toDifficultyLabel(value: "EASY" | "MEDIUM" | "HARD"): DifficultyLabel {
  if (value === "EASY") return "Easy";
  if (value === "MEDIUM") return "Medium";
  return "Hard";
}

export function toDifficultyEnum(value: string): "EASY" | "MEDIUM" | "HARD" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "easy") return "EASY";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "hard") return "HARD";
  throw new Error(`Unsupported difficulty: ${value}`);
}

export function normalizeCode(value: string): string {
  return String(value).replace(/\r/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isAnswerCorrect(answer: string, correctFix: string, buggyCode: string): boolean {
  const submitted = normalizeCode(answer);
  const correct = normalizeCode(correctFix);
  const original = normalizeCode(buggyCode);
  return submitted === correct || (submitted.includes(correct) && submitted !== original);
}

export function calculateSubmissionScore(input: {
  challenge: ChallengeForScoring;
  answer: string;
  timeLeftSeconds: number;
  hintsUsed: number;
}): { isCorrect: boolean; scoreAwarded: number; xpAwarded: number } {
  const difficulty = toDifficultyLabel(input.challenge.difficulty);
  const points = difficultyPoints[difficulty];
  const isCorrect = isAnswerCorrect(
    input.answer,
    input.challenge.activeVersion.correctFix,
    input.challenge.activeVersion.buggyCode
  );

  if (!isCorrect) {
    return { isCorrect, scoreAwarded: 0, xpAwarded: 0 };
  }

  const safeTimeLeft = Math.max(0, Math.min(points.seconds, input.timeLeftSeconds));
  const safeHintsUsed = Math.max(0, Math.min(20, input.hintsUsed));
  const earnedScore = points.score + safeTimeLeft * 2 - safeHintsUsed * 5;
  return {
    isCorrect,
    scoreAwarded: Math.max(points.score, earnedScore),
    xpAwarded: points.xp
  };
}

export function calculateServerSubmissionOutcome(input: {
  challenge: ChallengeForScoring;
  answer: string;
  challengeStartedAt: Date;
  submittedAt: Date;
  hintsUsedForChallenge: number;
}): ServerSubmissionOutcome {
  const difficulty = toDifficultyLabel(input.challenge.difficulty);
  const points = difficultyPoints[difficulty];
  const elapsedSeconds = Math.max(
    0,
    Math.floor((input.submittedAt.getTime() - input.challengeStartedAt.getTime()) / 1000)
  );
  const timeLeftSeconds = Math.max(0, points.seconds - elapsedSeconds);
  const timedOut = elapsedSeconds >= points.seconds;

  if (timedOut) {
    return {
      isCorrect: false,
      timedOut,
      scoreAwarded: 0,
      xpAwarded: 0,
      timeLeftSeconds: 0
    };
  }

  const isCorrect = isAnswerCorrect(
    input.answer,
    input.challenge.activeVersion.correctFix,
    input.challenge.activeVersion.buggyCode
  );

  if (!isCorrect) {
    return {
      isCorrect,
      timedOut,
      scoreAwarded: 0,
      xpAwarded: 0,
      timeLeftSeconds
    };
  }

  return {
    isCorrect,
    timedOut,
    scoreAwarded: calculateScoreAward({
      difficulty,
      timeLeftSeconds,
      hintsUsedForChallenge: input.hintsUsedForChallenge
    }),
    xpAwarded: points.xp,
    timeLeftSeconds
  };
}

export function calculateScoreAward(input: {
  difficulty: DifficultyLabel;
  timeLeftSeconds: number;
  hintsUsedForChallenge: number;
}): number {
  const points = difficultyPoints[input.difficulty];
  const safeTimeLeft = Math.max(0, Math.min(points.seconds, input.timeLeftSeconds));
  const safeHintsUsed = Math.max(0, Math.min(20, input.hintsUsedForChallenge));
  const earnedScore = points.score + safeTimeLeft * 2 - safeHintsUsed * 5;
  return Math.max(points.score, earnedScore);
}

export function applyOutcomeToSession(
  session: SessionStateForOutcome,
  outcome: ServerSubmissionOutcome
): NextSessionState {
  const attempts = session.attempts + 1;
  const correct = session.correct + (outcome.isCorrect ? 1 : 0);
  const score = session.score + outcome.scoreAwarded;
  const xp = session.xp + outcome.xpAwarded;
  const lives = outcome.isCorrect ? session.lives : Math.max(0, session.lives - 1);
  const streak = outcome.isCorrect ? session.streak + 1 : 0;
  const shouldAdvance = outcome.isCorrect || outcome.timedOut;
  const currentChallengeIndex = shouldAdvance ? session.currentChallengeIndex + 1 : session.currentChallengeIndex;
  const status =
    lives <= 0 ? "LOCKED" : currentChallengeIndex >= session.challengeCount ? "COMPLETED" : "IN_PROGRESS";

  return {
    score,
    xp,
    correct,
    attempts,
    lives,
    streak,
    currentChallengeIndex,
    status
  };
}

export type LeaderboardComparable = {
  score: number;
  timeTaken: number;
  accuracy: number;
  createdAt: Date | string;
};

export function compareLeaderboardEntries(a: LeaderboardComparable, b: LeaderboardComparable): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
  if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export type HintCounts = Record<string, number>;

export function normalizeHintCounts(value: unknown): HintCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<HintCounts>((counts, [key, raw]) => {
    const count = Number(raw || 0);
    counts[key] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    return counts;
  }, {});
}

export function getHintCount(value: unknown, challengeId: number): number {
  return normalizeHintCounts(value)[String(challengeId)] || 0;
}

export function incrementHintCount(value: unknown, challengeId: number): HintCounts {
  const counts = normalizeHintCounts(value);
  const key = String(challengeId);
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}

export function getAccuracy(correct: number, attempts: number): number {
  if (!attempts) return 0;
  return Math.round((correct / attempts) * 100);
}
