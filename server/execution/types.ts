export type TestVisibility = "visible" | "hidden";

export type WorkspaceTestCase = {
  id: string;
  name: string;
  visibility: TestVisibility;
  kind: "static" | "javascript";
  input?: string;
  expected: string;
  expression?: string;
  setup?: string;
};

export type WorkspaceTestResult = {
  id: string;
  name: string;
  visibility: TestVisibility;
  status: "passed" | "failed" | "error";
  expected?: string;
  actual?: string;
  output?: string;
  durationMs: number;
};

export type ExecutionRequest = {
  challengeId: number;
  language: string;
  code: string;
  buggyCode: string;
  correctFix: string;
  testCases: WorkspaceTestCase[];
};

export type ExecutionResult = {
  passed: boolean;
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  results: WorkspaceTestResult[];
  consoleOutput: string[];
  compilerOutput: string;
  durationMs: number;
  provider: string;
};

export interface ExecutionProvider {
  readonly name: string;
  run(request: ExecutionRequest): Promise<ExecutionResult>;
}
