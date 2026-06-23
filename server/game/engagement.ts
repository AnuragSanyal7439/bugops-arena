import type { Difficulty } from "@prisma/client";
import { toDifficultyLabel } from "./rules.js";

export const engagementModes = ["standard", "daily_bug", "track", "placement_prep", "no_hint", "boss"] as const;
export type EngagementMode = (typeof engagementModes)[number];

export type ChallengeSummary = {
  id: number;
  title: string;
  language: string;
  difficulty: Difficulty;
  topic: string;
};

export type TrackDefinition = {
  id: string;
  label: string;
  level: "beginner" | "intermediate" | "advanced" | "language" | "placement";
  description: string;
  difficulty?: Array<"Easy" | "Medium" | "Hard">;
  language?: string;
  bossEligible?: boolean;
};

export type ChallengePlanInput = {
  selectedDifficulty: "All" | "Easy" | "Medium" | "Hard";
  mode?: EngagementMode;
  trackId?: string;
};

export type ChallengePlan = {
  challengeIds: number[];
  mode: EngagementMode;
  trackId: string | null;
  engagementKey: string | null;
  noHintMode: boolean;
  bossChallenge: boolean;
};

export type QuestProgressInput = {
  weeklySubmissionCount: number;
  weeklyCorrectCount: number;
  weeklyNoHintCompletions: number;
  weeklyBossCompletions: number;
  weeklyLanguagesSolved: number;
};

export type WeeklyQuest = {
  id: string;
  label: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardXp: number;
};

export const trackDefinitions: TrackDefinition[] = [
  {
    id: "beginner",
    label: "Beginner Track",
    level: "beginner",
    description: "Easy syntax, variables, functions, arrays, and control-flow fundamentals.",
    difficulty: ["Easy"]
  },
  {
    id: "intermediate",
    label: "Intermediate Track",
    level: "intermediate",
    description: "Medium async, arrays, loops, memory, and type bugs with realistic failure signals.",
    difficulty: ["Medium"]
  },
  {
    id: "advanced",
    label: "Advanced Track",
    level: "advanced",
    description: "Hard edge cases across recursion, pointers, async, generics, and object semantics.",
    difficulty: ["Hard"],
    bossEligible: true
  },
  {
    id: "placement-prep",
    label: "Placement Preparation",
    level: "placement",
    description: "A mixed interview-style set spanning arrays, loops, strings, async, memory, and types."
  },
  languageTrack("javascript", "JavaScript"),
  languageTrack("python", "Python"),
  languageTrack("c", "C"),
  languageTrack("java", "Java")
];

export function buildChallengePlan(
  input: ChallengePlanInput,
  challenges: ChallengeSummary[],
  now = new Date()
): ChallengePlan {
  const mode = input.mode || "standard";
  const base = filterByDifficulty(challenges, input.selectedDifficulty);
  const fallback = base.length ? base : challenges;
  let selected = fallback;
  let trackId = input.trackId || null;
  let engagementKey: string | null = null;
  let noHintMode = false;
  let bossChallenge = false;

  if (mode === "daily_bug") {
    selected = [pickDailyChallenge(challenges, now)];
    engagementKey = `daily:${toDateKey(now)}`;
    trackId = "daily-bug";
  } else if (mode === "track") {
    const track = getTrackDefinition(input.trackId || "beginner");
    trackId = track.id;
    selected = applyTrack(challenges, track);
  } else if (mode === "placement_prep") {
    trackId = "placement-prep";
    selected = applyTrack(challenges, getTrackDefinition("placement-prep")).slice(0, 12);
  } else if (mode === "no_hint") {
    noHintMode = true;
    trackId = "no-hint";
    selected = fallback;
  } else if (mode === "boss") {
    bossChallenge = true;
    trackId = "boss";
    selected = challenges.filter((challenge) => challenge.difficulty === "HARD").slice(0, 5);
  }

  const challengeIds = selected.map((challenge) => challenge.id);
  return {
    challengeIds: challengeIds.length ? challengeIds : fallback.map((challenge) => challenge.id),
    mode,
    trackId,
    engagementKey,
    noHintMode,
    bossChallenge
  };
}

export function getTrackDefinition(trackId: string): TrackDefinition {
  return trackDefinitions.find((track) => track.id === trackId) || trackDefinitions[0];
}

export function buildWeeklyQuests(input: QuestProgressInput): WeeklyQuest[] {
  return [
    quest("weekly-first-five", "Five Fixes", "Solve five bugs this week.", 5, input.weeklyCorrectCount, 120),
    quest("weekly-polyglot", "Two-Language Sprint", "Solve bugs in two languages this week.", 2, input.weeklyLanguagesSolved, 140),
    quest("weekly-clean-room", "Clean Room", "Complete one no-hint run this week.", 1, input.weeklyNoHintCompletions, 160),
    quest("weekly-boss", "Boss Breaker", "Complete one boss challenge this week.", 1, input.weeklyBossCompletions, 220)
  ];
}

export function getWeekStart(date = new Date()): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

export function getMonthStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function engagementAchievementCandidates(input: {
  mode: string;
  noHintMode: boolean;
  bossChallenge: boolean;
  sessionCompleted: boolean;
  sessionHintsUsed: number;
  totalCorrect: number;
  totalXP: number;
  weeklyQuestsCompleted: number;
}): Array<{ code: string; label: string }> {
  const achievements: Array<{ code: string; label: string }> = [];

  if (input.mode === "daily_bug" && input.sessionCompleted) {
    achievements.push({ code: "daily-debugger", label: "Daily Debugger" });
  }
  if (input.noHintMode && input.sessionCompleted && input.sessionHintsUsed === 0) {
    achievements.push({ code: "no-hint-clear", label: "Clean Room Clear" });
  }
  if (input.bossChallenge && input.sessionCompleted) {
    achievements.push({ code: "boss-breaker", label: "Boss Breaker" });
  }
  if (input.weeklyQuestsCompleted >= 2) {
    achievements.push({ code: "quest-streaker", label: "Quest Streaker" });
  }
  if (input.totalCorrect >= 25) {
    achievements.push({ code: "bug-surgeon", label: "Bug Surgeon" });
  }
  if (input.totalXP >= 1000) {
    achievements.push({ code: "xp-1000", label: "Kilobyte Climber" });
  }

  return achievements;
}

export function serializeTrack(track: TrackDefinition) {
  return {
    id: track.id,
    label: track.label,
    level: track.level,
    description: track.description,
    language: track.language || null,
    difficulty: track.difficulty || null
  };
}

function filterByDifficulty(challenges: ChallengeSummary[], selectedDifficulty: string): ChallengeSummary[] {
  if (selectedDifficulty === "All") {
    return challenges;
  }

  return challenges.filter((challenge) => toDifficultyLabel(challenge.difficulty) === selectedDifficulty);
}

function applyTrack(challenges: ChallengeSummary[], track: TrackDefinition): ChallengeSummary[] {
  let selected = [...challenges];
  if (track.language) {
    selected = selected.filter((challenge) => challenge.language.toLowerCase() === track.language?.toLowerCase());
  }
  if (track.difficulty) {
    selected = selected.filter((challenge) => track.difficulty?.includes(toDifficultyLabel(challenge.difficulty)));
  }

  if (track.id === "placement-prep") {
    selected = selected.sort((a, b) => placementWeight(a) - placementWeight(b) || a.id - b.id);
  }

  return selected.length ? selected : challenges;
}

function pickDailyChallenge(challenges: ChallengeSummary[], now: Date): ChallengeSummary {
  const index = hashDate(toDateKey(now)) % Math.max(1, challenges.length);
  return [...challenges].sort((a, b) => a.id - b.id)[index];
}

function hashDate(value: string): number {
  return [...value].reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

function placementWeight(challenge: ChallengeSummary): number {
  const topicOrder = ["Arrays", "Strings", "Loops", "Functions", "Types", "Async", "Memory", "Conditionals"];
  const topicIndex = topicOrder.indexOf(challenge.topic);
  return (topicIndex === -1 ? 99 : topicIndex) * 10 + challenge.id;
}

function languageTrack(id: string, language: string): TrackDefinition {
  return {
    id: `language-${id}`,
    label: `${language} Track`,
    level: "language",
    description: `Language-specific debugging practice for ${language}.`,
    language
  };
}

function quest(id: string, label: string, description: string, target: number, rawProgress: number, rewardXp: number): WeeklyQuest {
  const progress = Math.max(0, Math.min(target, rawProgress));
  return {
    id,
    label,
    description,
    target,
    progress,
    completed: progress >= target,
    rewardXp
  };
}
