import { describe, expect, it } from "vitest";
import { buildAdaptiveRecommendations, buildSkillMastery } from "../server/game/recommendations.js";
import { initialProgress } from "../server/game/progress.js";

describe("adaptive recommendations", () => {
  it("uses mistakes, hints, timing, and mastery to recommend next actions", () => {
    const progress = {
      ...initialProgress,
      totalAttempts: 12,
      totalCorrect: 8,
      bestStreak: 5,
      languageStats: {
        JavaScript: { attempts: 5, correct: 5 },
        Python: { attempts: 4, correct: 1 }
      },
      topicStats: {
        Arrays: { attempts: 5, correct: 2 },
        Async: { attempts: 3, correct: 3 }
      }
    };
    const recommendations = buildAdaptiveRecommendations(progress, [
      { isCorrect: false, hintsUsed: 2, timeLeftSeconds: 0, challenge: { topic: "Arrays", language: "Python", difficulty: "MEDIUM" } },
      { isCorrect: false, hintsUsed: 1, timeLeftSeconds: 0, challenge: { topic: "Arrays", language: "Python", difficulty: "MEDIUM" } },
      { isCorrect: true, hintsUsed: 0, timeLeftSeconds: 5, challenge: { topic: "Async", language: "JavaScript", difficulty: "MEDIUM" } }
    ]);

    expect(recommendations.map((recommendation) => recommendation.id)).toContain("recent-mistake-topic");
    expect(recommendations.map((recommendation) => recommendation.id)).toContain("hint-heavy-language");
    expect(recommendations.map((recommendation) => recommendation.id)).toContain("slow-completion-topic");
    expect(recommendations.map((recommendation) => recommendation.id)).toContain("weakest-language");
  });

  it("builds sorted mastery bands", () => {
    const mastery = buildSkillMastery({
      ...initialProgress,
      topicStats: {
        Arrays: { attempts: 4, correct: 1 },
        Async: { attempts: 4, correct: 4 }
      }
    });

    expect(mastery.topics[0]).toMatchObject({ key: "Arrays", mastery: "learning" });
    expect(mastery.topics[1]).toMatchObject({ key: "Async", mastery: "strong" });
  });
});
