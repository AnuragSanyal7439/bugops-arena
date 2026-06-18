import { describe, expect, it } from "vitest";
import {
  applySubmissionToProgress,
  initialProgress,
  mergeLegacyProgress,
  unlockedAchievements
} from "../server/game/progress.js";

describe("progress rules", () => {
  it("updates aggregate progress for correct submissions", () => {
    const progress = applySubmissionToProgress(initialProgress, {
      isCorrect: true,
      xpAwarded: 40,
      topic: "Functions",
      difficulty: "Easy",
      language: "JavaScript"
    });

    expect(progress.totalAttempts).toBe(1);
    expect(progress.totalCorrect).toBe(1);
    expect(progress.bugsFixed).toBe(1);
    expect(progress.totalXP).toBe(40);
    expect(progress.currentStreak).toBe(1);
    expect(progress.bestStreak).toBe(1);
    expect(progress.topicStats.Functions).toEqual({ attempts: 1, correct: 1 });
  });

  it("resets current streak for incorrect submissions", () => {
    const first = applySubmissionToProgress(initialProgress, {
      isCorrect: true,
      xpAwarded: 40,
      topic: "Functions",
      difficulty: "Easy",
      language: "JavaScript"
    });
    const second = applySubmissionToProgress(first, {
      isCorrect: false,
      xpAwarded: 0,
      topic: "Arrays",
      difficulty: "Medium",
      language: "Python"
    });

    expect(second.currentStreak).toBe(0);
    expect(second.bestStreak).toBe(1);
    expect(second.totalAttempts).toBe(2);
  });

  it("unlocks achievements from aggregate progress", () => {
    const progress = {
      ...initialProgress,
      bugsFixed: 1,
      bestStreak: 3,
      totalXP: 260,
      languageStats: {
        JavaScript: { attempts: 1, correct: 1 },
        Python: { attempts: 1, correct: 1 },
        C: { attempts: 1, correct: 1 },
        Java: { attempts: 1, correct: 1 }
      },
      difficultyStats: {
        Hard: { attempts: 2, correct: 2 }
      }
    };

    expect(unlockedAchievements(progress, []).map((achievement) => achievement.code)).toEqual([
      "first-fix",
      "streak-3",
      "xp-250",
      "polyglot",
      "hard-mode"
    ]);
  });

  it("merges legacy local progress by taking the safest maximum values", () => {
    const merged = mergeLegacyProgress(
      {
        ...initialProgress,
        totalAttempts: 2,
        totalCorrect: 1,
        topicStats: { Functions: { attempts: 2, correct: 1 } }
      },
      {
        totalAttempts: 5,
        totalCorrect: 4,
        badges: ["first-fix"],
        topicStats: { Functions: { attempts: 3, correct: 2 }, Arrays: { attempts: 2, correct: 2 } }
      }
    );

    expect(merged.totalAttempts).toBe(5);
    expect(merged.totalCorrect).toBe(4);
    expect(merged.badges).toEqual(["first-fix"]);
    expect(merged.topicStats.Functions).toEqual({ attempts: 3, correct: 2 });
    expect(merged.topicStats.Arrays).toEqual({ attempts: 2, correct: 2 });
  });
});
