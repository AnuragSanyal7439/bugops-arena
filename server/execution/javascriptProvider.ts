import { spawn } from "node:child_process";
import path from "node:path";
import type { ExecutionProvider, ExecutionRequest, ExecutionResult } from "./types.js";

const workerPath = path.join(process.cwd(), "server", "execution", "javascriptWorker.cjs");

export class ChildProcessJavaScriptExecutionProvider implements ExecutionProvider {
  readonly name = "javascript-child-process";

  constructor(private readonly timeoutMs = 2500) {}

  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    const startedAt = Date.now();

    return new Promise((resolve) => {
      const child = spawn(process.execPath, [workerPath], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill();
          resolve(timeoutResult(request, Date.now() - startedAt, this.name));
        }
      }, this.timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      child.on("close", () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);

        try {
          const parsed = JSON.parse(stdout) as ExecutionResult;
          resolve({
            ...parsed,
            compilerOutput: [parsed.compilerOutput, stderr.trim()].filter(Boolean).join("\n"),
            provider: this.name,
            durationMs: Date.now() - startedAt
          });
        } catch {
          resolve(errorResult(request, stderr || stdout || "JavaScript worker returned invalid output.", Date.now() - startedAt, this.name));
        }
      });

      child.stdin.end(JSON.stringify(request));
    });
  }
}

function timeoutResult(request: ExecutionRequest, durationMs: number, provider: string): ExecutionResult {
  const results = request.testCases.map((testCase) => ({
    id: testCase.id,
    name: testCase.name,
    visibility: testCase.visibility,
    status: "error" as const,
    expected: testCase.expected,
    actual: "Execution timed out.",
    output: "The submitted code did not finish before the timeout.",
    durationMs
  }));
  const visibleTotal = results.filter((result) => result.visibility === "visible").length;
  const hiddenTotal = results.filter((result) => result.visibility === "hidden").length;

  return {
    passed: false,
    visiblePassed: 0,
    visibleTotal,
    hiddenPassed: 0,
    hiddenTotal,
    results,
    consoleOutput: [],
    compilerOutput: "Execution timed out in the isolated worker process.",
    durationMs,
    provider
  };
}

function errorResult(request: ExecutionRequest, message: string, durationMs: number, provider: string): ExecutionResult {
  const results = request.testCases.map((testCase) => ({
    id: testCase.id,
    name: testCase.name,
    visibility: testCase.visibility,
    status: "error" as const,
    expected: testCase.expected,
    actual: "Worker error.",
    output: message.slice(0, 1000),
    durationMs
  }));
  const visibleTotal = results.filter((result) => result.visibility === "visible").length;
  const hiddenTotal = results.filter((result) => result.visibility === "hidden").length;

  return {
    passed: false,
    visiblePassed: 0,
    visibleTotal,
    hiddenPassed: 0,
    hiddenTotal,
    results,
    consoleOutput: [],
    compilerOutput: message.slice(0, 1000),
    durationMs,
    provider
  };
}
