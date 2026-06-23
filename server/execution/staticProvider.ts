import { normalizeCode } from "../game/rules.js";
import type { ExecutionProvider, ExecutionRequest, ExecutionResult, WorkspaceTestCase, WorkspaceTestResult } from "./types.js";

export class StaticPatchExecutionProvider implements ExecutionProvider {
  readonly name = "static-patch";

  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    const startedAt = Date.now();
    const results = request.testCases.map((testCase) => runStaticTest(request, testCase));
    const durationMs = Date.now() - startedAt;
    const visibleResults = results.filter((result) => result.visibility === "visible");
    const hiddenResults = results.filter((result) => result.visibility === "hidden");

    return {
      passed: results.every((result) => result.status === "passed"),
      visiblePassed: visibleResults.filter((result) => result.status === "passed").length,
      visibleTotal: visibleResults.length,
      hiddenPassed: hiddenResults.filter((result) => result.status === "passed").length,
      hiddenTotal: hiddenResults.length,
      results,
      consoleOutput: [],
      compilerOutput:
        "Static verifier only: this language is not executed until an isolated compiler sandbox is configured.",
      durationMs,
      provider: this.name
    };
  }
}

function runStaticTest(request: ExecutionRequest, testCase: WorkspaceTestCase): WorkspaceTestResult {
  const startedAt = Date.now();
  const submitted = normalizeCode(request.code);
  const original = normalizeCode(request.buggyCode);
  const expectedFix = normalizeCode(request.correctFix);
  const changed = submitted !== original;
  const containsExpectedFix = expectedFix.length > 0 && submitted.includes(expectedFix);
  const passed = testCase.id === "visible-1" ? changed : changed && containsExpectedFix;

  return {
    id: testCase.id,
    name: testCase.name,
    visibility: testCase.visibility,
    status: passed ? "passed" : "failed",
    expected: testCase.id === "visible-1" ? "Code should differ from the starter snippet." : testCase.expected,
    actual: testCase.id === "visible-1" ? (changed ? "Code changed." : "Code is unchanged.") : summarizePatch(containsExpectedFix),
    output: passed ? "Static check passed." : "Static check failed.",
    durationMs: Date.now() - startedAt
  };
}

function summarizePatch(containsExpectedFix: boolean): string {
  return containsExpectedFix ? "Expected repair pattern was found." : "Expected repair pattern was not found.";
}
