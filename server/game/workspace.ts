import type { WorkspaceTestCase } from "../execution/types.js";

export type WorkspaceChallengeSeed = {
  id: number;
  title: string;
  language: string;
  difficulty: string;
  topic: string;
  buggyCode: string;
  correctFix: string;
  hint: string;
  explanation: string;
};

const javascriptRuntimeSpecs: Record<number, Array<Omit<WorkspaceTestCase, "kind">>> = {
  1: [
    jsCase("visible-1", "adds two positive numbers", "add(2, 3)", "5", "visible"),
    jsCase("hidden-1", "handles negative operands", "add(-2, 7)", "5", "hidden")
  ],
  3: [
    jsCase("visible-1", "allows admins to deploy", 'canDeploy(true)', '"deploy"', "visible"),
    jsCase("hidden-1", "blocks non-admin users", 'canDeploy(false)', '"blocked"', "hidden")
  ],
  6: [
    jsCase("visible-1", "returns the final list item", "getLast([1, 2, 3])", "3", "visible"),
    jsCase("hidden-1", "works for single-item lists", 'getLast(["only"])', '"only"', "hidden")
  ],
  10: [
    jsCase(
      "visible-1",
      "awaits the JSON body before reading the name",
      "await loadUser()",
      '"Ada"',
      "visible",
      'globalThis.fetch = async () => ({ json: async () => ({ name: "Ada" }) });'
    ),
    jsCase(
      "hidden-1",
      "propagates the resolved user value",
      "await loadUser()",
      '"Grace"',
      "hidden",
      'globalThis.fetch = async () => ({ json: async () => ({ name: "Grace" }) });'
    )
  ],
  16: [
    jsCase("visible-1", "maps each price to a discounted value", "discounted", "[9,18,27]", "visible"),
    jsCase("hidden-1", "does not leave undefined map entries", "discounted.every(value => value !== undefined)", "true", "hidden")
  ],
  20: [
    jsCase("visible-1", "returns true for zero", "isZero(0)", "true", "visible"),
    jsCase("hidden-1", "does not coerce string zero", 'isZero("0")', "false", "hidden")
  ],
  24: [
    jsCase(
      "visible-1",
      "returns the promise chain to callers",
      "await loadScore()",
      "42",
      "visible",
      'globalThis.fetch = async () => ({ json: async () => ({ score: 42 }) });'
    ),
    jsCase(
      "hidden-1",
      "allows callers to await another score",
      "await loadScore()",
      "7",
      "hidden",
      'globalThis.fetch = async () => ({ json: async () => ({ score: 7 }) });'
    )
  ],
  28: [
    jsCase("visible-1", "first handler keeps its own loop value", "handlers[0]()", "0", "visible"),
    jsCase("hidden-1", "all handlers keep independent loop values", "handlers.map(handler => handler())", "[0,1,2]", "hidden")
  ],
  31: [
    jsCase("visible-1", "sorts numbers numerically", "scores", "[1,4,21,30]", "visible"),
    jsCase("hidden-1", "keeps every score after sorting", "scores.length", "4", "hidden")
  ],
  35: [
    jsCase(
      "visible-1",
      "registers the click handler without calling it",
      "globalThis.registeredHandlerType",
      '"function"',
      "visible",
      "globalThis.saveScore = () => { globalThis.calledDuringSetup = true; }; globalThis.button = { addEventListener: (_event, handler) => { globalThis.registeredHandlerType = typeof handler; } };"
    ),
    jsCase(
      "hidden-1",
      "does not fire saveScore during setup",
      "Boolean(globalThis.calledDuringSetup)",
      "false",
      "hidden",
      "globalThis.saveScore = () => { globalThis.calledDuringSetup = true; }; globalThis.button = { addEventListener: (_event, handler) => { globalThis.registeredHandlerType = typeof handler; } };"
    )
  ],
  39: [
    jsCase("visible-1", "method reads the player score", "player.show()", "10", "visible"),
    jsCase("hidden-1", "method still works when called as an object method", "player.show.call({ score: 14 })", "14", "hidden")
  ],
  41: [
    jsCase("visible-1", "empty reduce returns the neutral seed", "total", "0", "visible"),
    jsCase("hidden-1", "total is a number", "typeof total", '"number"', "hidden")
  ],
  45: [
    jsCase(
      "visible-1",
      "does not throw when the panel is missing",
      "panel === null",
      "true",
      "visible",
      "globalThis.document = { querySelector: () => null };"
    ),
    jsCase(
      "hidden-1",
      "queries the expected selector",
      "globalThis.lastSelector",
      '".score-panel"',
      "hidden",
      "globalThis.document = { querySelector: (selector) => { globalThis.lastSelector = selector; return null; } };"
    )
  ],
  49: [
    jsCase(
      "visible-1",
      "allows await inside the profile function",
      "await getProfile()",
      '{"role":"admin"}',
      "visible",
      'globalThis.fetch = async () => ({ json: async () => ({ role: "admin" }) });'
    ),
    jsCase(
      "hidden-1",
      "returns the parsed profile object",
      "(await getProfile()).role",
      '"ops"',
      "hidden",
      'globalThis.fetch = async () => ({ json: async () => ({ role: "ops" }) });'
    )
  ]
};

export function buildWorkspaceHints(challenge: WorkspaceChallengeSeed): string[] {
  return [
    `What does this ${challenge.topic.toLowerCase()} code promise to do, and which line breaks that promise?`,
    challenge.hint,
    `Run the visible test and compare the actual value with the expected value before editing more code.`,
    `The likely root is a ${challenge.topic.toLowerCase()} mistake in the highlighted snippet, not a scoring or UI issue.`,
    `Make the smallest code change that removes this bug pattern, then rerun both visible and hidden tests.`
  ];
}

export function buildWorkspaceTestCases(challenge: WorkspaceChallengeSeed): WorkspaceTestCase[] {
  const javascriptSpecs = javascriptRuntimeSpecs[challenge.id];
  if (challenge.language === "JavaScript" && javascriptSpecs?.length) {
    return javascriptSpecs.map((testCase) => ({ ...testCase, kind: "javascript" }));
  }

  return [
    {
      id: "visible-1",
      name: "changes the starter code",
      visibility: "visible",
      kind: "static",
      expected: "Submitted code differs from the original buggy snippet."
    },
    {
      id: "visible-2",
      name: "contains the expected repair pattern",
      visibility: "visible",
      kind: "static",
      expected: challenge.correctFix
    },
    {
      id: "hidden-1",
      name: "preserves the canonical fix under hidden review",
      visibility: "hidden",
      kind: "static",
      expected: challenge.correctFix
    }
  ];
}

export function buildRootCause(challenge: WorkspaceChallengeSeed): string {
  return challenge.explanation;
}

function jsCase(
  id: string,
  name: string,
  expression: string,
  expected: string,
  visibility: "visible" | "hidden",
  setup?: string
): Omit<WorkspaceTestCase, "kind"> {
  return {
    id,
    name,
    visibility,
    expected,
    expression,
    setup
  };
}
