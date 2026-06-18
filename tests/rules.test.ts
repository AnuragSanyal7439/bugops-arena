import { describe, expect, it } from "vitest";
import {
  applyOutcomeToSession,
  calculateScoreAward,
  calculateServerSubmissionOutcome,
  calculateSubmissionScore,
  compareLeaderboardEntries,
  getAccuracy,
  isAnswerCorrect
} from "../server/game/rules.js";

const challenge = {
  id: 1,
  language: "JavaScript",
  topic: "Functions",
  difficulty: "EASY" as const,
  activeVersion: {
    id: "version-1",
    correctFix: "return a + b;",
    buggyCode: "function add(a, b) { return a - b; }"
  }
};

describe("game rules", () => {
  it("accepts exact and embedded corrected fixes", () => {
    expect(isAnswerCorrect("return a + b;", "return a + b;", "return a - b;")).toBe(true);
    expect(isAnswerCorrect("function add(a,b){ return a + b; }", "return a + b;", "return a - b;")).toBe(true);
  });

  it("rejects unchanged buggy code", () => {
    expect(isAnswerCorrect("function add(a, b) { return a - b; }", "return a + b;", challenge.activeVersion.buggyCode)).toBe(false);
  });

  it("calculates score with time bonus and hint penalty", () => {
    const result = calculateSubmissionScore({
      challenge,
      answer: "return a + b;",
      timeLeftSeconds: 20,
      hintsUsed: 2
    });

    expect(result).toEqual({
      isCorrect: true,
      scoreAwarded: 130,
      xpAwarded: 40
    });
  });

  it("does not award score or XP for wrong answers", () => {
    const result = calculateSubmissionScore({
      challenge,
      answer: "return a * b;",
      timeLeftSeconds: 20,
      hintsUsed: 0
    });

    expect(result).toEqual({
      isCorrect: false,
      scoreAwarded: 0,
      xpAwarded: 0
    });
  });

  it("calculates rounded accuracy", () => {
    expect(getAccuracy(2, 3)).toBe(67);
    expect(getAccuracy(0, 0)).toBe(0);
  });

  it("calculates XP on the server from challenge difficulty", () => {
    const outcome = calculateServerSubmissionOutcome({
      challenge,
      answer: "return a + b;",
      challengeStartedAt: new Date("2026-06-18T00:00:00.000Z"),
      submittedAt: new Date("2026-06-18T00:00:10.000Z"),
      hintsUsedForChallenge: 0
    });

    expect(outcome.xpAwarded).toBe(40);
  });

  it("applies hint penalties without dropping below base score", () => {
    expect(calculateScoreAward({ difficulty: "Easy", timeLeftSeconds: 20, hintsUsedForChallenge: 0 })).toBe(140);
    expect(calculateScoreAward({ difficulty: "Easy", timeLeftSeconds: 20, hintsUsedForChallenge: 2 })).toBe(130);
    expect(calculateScoreAward({ difficulty: "Easy", timeLeftSeconds: 0, hintsUsedForChallenge: 20 })).toBe(100);
  });

  it("updates server-owned streaks, lives, and completion status", () => {
    const correct = applyOutcomeToSession(
      {
        score: 0,
        xp: 0,
        correct: 0,
        attempts: 0,
        lives: 3,
        streak: 0,
        currentChallengeIndex: 0,
        challengeCount: 2
      },
      { isCorrect: true, timedOut: false, scoreAwarded: 120, xpAwarded: 40, timeLeftSeconds: 10 }
    );

    expect(correct.streak).toBe(1);
    expect(correct.lives).toBe(3);
    expect(correct.currentChallengeIndex).toBe(1);
    expect(correct.status).toBe("IN_PROGRESS");

    const wrong = applyOutcomeToSession({ ...correct, challengeCount: 2 }, {
      isCorrect: false,
      timedOut: false,
      scoreAwarded: 0,
      xpAwarded: 0,
      timeLeftSeconds: 8
    });

    expect(wrong.streak).toBe(0);
    expect(wrong.lives).toBe(2);
    expect(wrong.currentChallengeIndex).toBe(1);
  });

  it("orders leaderboard ties by score, faster time, accuracy, then creation time", () => {
    const entries = [
      { score: 100, timeTaken: 60, accuracy: 80, createdAt: "2026-06-18T00:00:03.000Z" },
      { score: 100, timeTaken: 55, accuracy: 70, createdAt: "2026-06-18T00:00:02.000Z" },
      { score: 120, timeTaken: 90, accuracy: 50, createdAt: "2026-06-18T00:00:01.000Z" },
      { score: 100, timeTaken: 55, accuracy: 90, createdAt: "2026-06-18T00:00:04.000Z" }
    ];

    expect([...entries].sort(compareLeaderboardEntries)).toEqual([
      entries[2],
      entries[3],
      entries[1],
      entries[0]
    ]);
  });
});
