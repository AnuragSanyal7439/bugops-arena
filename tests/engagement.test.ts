import { describe, expect, it } from "vitest";
import {
  buildChallengePlan,
  buildWeeklyQuests,
  engagementAchievementCandidates,
  getWeekStart
} from "../server/game/engagement.js";
import { createSessionSchema } from "../server/routes/game.js";

const challenges = [
  { id: 1, title: "Easy JS", language: "JavaScript", difficulty: "EASY" as const, topic: "Functions" },
  { id: 2, title: "Medium Python", language: "Python", difficulty: "MEDIUM" as const, topic: "Loops" },
  { id: 3, title: "Hard C", language: "C", difficulty: "HARD" as const, topic: "Memory" },
  { id: 4, title: "Hard Java", language: "Java", difficulty: "HARD" as const, topic: "Types" }
];

describe("engagement rules", () => {
  it("accepts mode and track requests but rejects forged challenge lists", () => {
    expect(
      createSessionSchema.parse({
        selectedDifficulty: "All",
        mode: "track",
        trackId: "language-javascript"
      })
    ).toEqual({ selectedDifficulty: "All", mode: "track", trackId: "language-javascript" });

    expect(() =>
      createSessionSchema.parse({
        selectedDifficulty: "All",
        mode: "daily_bug",
        challengeIds: [999]
      })
    ).toThrow();
  });

  it("selects daily bug and no-hint plans server-side", () => {
    const daily = buildChallengePlan({ selectedDifficulty: "All", mode: "daily_bug" }, challenges, new Date("2026-06-23T00:00:00.000Z"));
    const noHint = buildChallengePlan({ selectedDifficulty: "Medium", mode: "no_hint" }, challenges);

    expect(daily.challengeIds).toHaveLength(1);
    expect(daily.engagementKey).toBe("daily:2026-06-23");
    expect(noHint.noHintMode).toBe(true);
    expect(noHint.challengeIds).toEqual([2]);
  });

  it("computes weekly quest completion from server aggregates", () => {
    const quests = buildWeeklyQuests({
      weeklySubmissionCount: 8,
      weeklyCorrectCount: 5,
      weeklyNoHintCompletions: 1,
      weeklyBossCompletions: 0,
      weeklyLanguagesSolved: 2
    });

    expect(quests.find((quest) => quest.id === "weekly-first-five")?.completed).toBe(true);
    expect(quests.find((quest) => quest.id === "weekly-clean-room")?.completed).toBe(true);
    expect(quests.find((quest) => quest.id === "weekly-boss")?.completed).toBe(false);
  });

  it("unlocks engagement achievements only from server-derived session facts", () => {
    expect(
      engagementAchievementCandidates({
        mode: "daily_bug",
        noHintMode: true,
        bossChallenge: true,
        sessionCompleted: true,
        sessionHintsUsed: 0,
        totalCorrect: 30,
        totalXP: 1200,
        weeklyQuestsCompleted: 2
      }).map((achievement) => achievement.code)
    ).toEqual(["daily-debugger", "no-hint-clear", "boss-breaker", "quest-streaker", "bug-surgeon", "xp-1000"]);
  });

  it("uses Monday as the UTC weekly boundary", () => {
    expect(getWeekStart(new Date("2026-06-23T12:00:00.000Z")).toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });
});
