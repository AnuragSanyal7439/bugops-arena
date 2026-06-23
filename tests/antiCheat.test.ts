import { describe, expect, it } from "vitest";
import { createSessionSchema, submissionSchema } from "../server/routes/game.js";
import { submitLeaderboardSchema } from "../server/routes/leaderboard.js";

const sessionId = "00000000-0000-4000-8000-000000000001";

describe("anti-cheat validation", () => {
  it("rejects forged challenge order during session creation", () => {
    expect(() =>
      createSessionSchema.parse({
        selectedDifficulty: "All",
        challengeIds: [1],
        score: 999999
      })
    ).toThrow();
  });

  it("rejects forged correctness, score, XP, timing, and hint values on submissions", () => {
    expect(() =>
      submissionSchema.parse({
        gameSessionId: sessionId,
        answer: "return a + b;",
        isCorrect: true,
        scoreAwarded: 999999,
        xpAwarded: 999999,
        timeLeftSeconds: 999,
        hintsUsed: 0,
        status: "COMPLETED"
      })
    ).toThrow();
  });

  it("rejects forged leaderboard score requests", () => {
    expect(() =>
      submitLeaderboardSchema.parse({
        gameSessionId: sessionId,
        username: "Cheater",
        score: 999999,
        xp: 999999,
        accuracy: 100,
        timeTaken: 1
      })
    ).toThrow();
  });
});
