import type { Prisma } from "@prisma/client";
import { ChildProcessJavaScriptExecutionProvider } from "./javascriptProvider.js";
import { StaticPatchExecutionProvider } from "./staticProvider.js";
import type { ExecutionProvider, ExecutionRequest, ExecutionResult, WorkspaceTestCase, WorkspaceTestResult } from "./types.js";

const staticProvider = new StaticPatchExecutionProvider();
const javascriptProvider = new ChildProcessJavaScriptExecutionProvider();

export function createExecutionProvider(language: string): ExecutionProvider {
  return language === "JavaScript" ? javascriptProvider : staticProvider;
}

export async function runChallengeTests(request: ExecutionRequest): Promise<ExecutionResult> {
  const provider = createExecutionProvider(request.language);
  return provider.run(request);
}

export function parseWorkspaceTestCases(value: Prisma.JsonValue): WorkspaceTestCase[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isWorkspaceTestCase);
}

export function maskHiddenExecutionResult(result: ExecutionResult, revealHidden = false): ExecutionResult {
  if (revealHidden) {
    return result;
  }

  return {
    ...result,
    results: result.results.map(maskHiddenTestResult)
  };
}

function maskHiddenTestResult(result: WorkspaceTestResult): WorkspaceTestResult {
  if (result.visibility === "visible") {
    return result;
  }

  return {
    id: result.id,
    name: result.name,
    visibility: result.visibility,
    status: result.status,
    expected: "Hidden until completion.",
    actual: result.status === "passed" ? "Hidden test passed." : "Hidden test did not pass.",
    output: result.status === "passed" ? "Hidden assertion passed." : "Details unlock after completion.",
    durationMs: result.durationMs
  };
}

function isWorkspaceTestCase(value: unknown): value is WorkspaceTestCase {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<WorkspaceTestCase>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    (candidate.visibility === "visible" || candidate.visibility === "hidden") &&
    (candidate.kind === "static" || candidate.kind === "javascript") &&
    typeof candidate.expected === "string"
  );
}
