import { describe, expect, it } from "vitest";
import { maskHiddenExecutionResult, runChallengeTests } from "../server/execution/index.js";
import { buildWorkspaceTestCases } from "../server/game/workspace.js";

const additionChallenge = {
  id: 1,
  title: "Addition Operator Drift",
  language: "JavaScript",
  difficulty: "Easy",
  topic: "Functions",
  buggyCode: `function add(a, b) {
  return a - b;
}`,
  correctFix: "return a + b;",
  hint: "Check the operator used in the return statement.",
  explanation: "The function should add two values, but it was subtracting them."
};

describe("execution provider", () => {
  it("runs JavaScript visible and hidden tests outside the API process", async () => {
    const result = await runChallengeTests({
      challengeId: additionChallenge.id,
      language: additionChallenge.language,
      code: `function add(a, b) {
  return a + b;
}`,
      buggyCode: additionChallenge.buggyCode,
      correctFix: additionChallenge.correctFix,
      testCases: buildWorkspaceTestCases(additionChallenge)
    });

    expect(result.provider).toBe("javascript-child-process");
    expect(result.passed).toBe(true);
    expect(result.visiblePassed).toBe(1);
    expect(result.hiddenPassed).toBe(1);
  });

  it("fails forged fixes that do not satisfy hidden tests", async () => {
    const result = await runChallengeTests({
      challengeId: additionChallenge.id,
      language: additionChallenge.language,
      code: `function add(a, b) {
  return a - b;
}`,
      buggyCode: additionChallenge.buggyCode,
      correctFix: additionChallenge.correctFix,
      testCases: buildWorkspaceTestCases(additionChallenge)
    });

    expect(result.passed).toBe(false);
    expect(result.results.some((test) => test.status === "failed")).toBe(true);
  });

  it("masks hidden expected and actual values before completion", async () => {
    const result = await runChallengeTests({
      challengeId: additionChallenge.id,
      language: additionChallenge.language,
      code: `function add(a, b) {
  return a - b;
}`,
      buggyCode: additionChallenge.buggyCode,
      correctFix: additionChallenge.correctFix,
      testCases: buildWorkspaceTestCases(additionChallenge)
    });
    const masked = maskHiddenExecutionResult(result, false);

    expect(masked.results.find((test) => test.visibility === "hidden")?.expected).toBe("Hidden until completion.");
  });
});
