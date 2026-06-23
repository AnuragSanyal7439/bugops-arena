const vm = require("node:vm");

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", async () => {
  const startedAt = Date.now();

  try {
    const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const result = await runRequest(request, startedAt);
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        passed: false,
        visiblePassed: 0,
        visibleTotal: 0,
        hiddenPassed: 0,
        hiddenTotal: 0,
        results: [],
        consoleOutput: [],
        compilerOutput: formatError(error),
        durationMs: Date.now() - startedAt,
        provider: "javascript-child-process"
      })
    );
  }
});

async function runRequest(request, startedAt) {
  const consoleOutput = [];
  const results = [];
  let compilerOutput = "";

  for (const testCase of request.testCases) {
    const testStartedAt = Date.now();
    const context = createContext(consoleOutput);

    try {
      if (testCase.setup) {
        new vm.Script(testCase.setup, { filename: `${testCase.id}.setup.js` }).runInContext(context, { timeout: 500 });
      }

      new vm.Script(request.code, { filename: "submission.js" }).runInContext(context, { timeout: 900 });

      const expression = testCase.expression || "undefined";
      const actual = await new vm.Script(`(async () => (${expression}))()`, {
        filename: `${testCase.id}.assert.js`
      }).runInContext(context, { timeout: 900 });
      const serializedActual = stableStringify(actual);
      const passed = serializedActual === testCase.expected;

      results.push({
        id: testCase.id,
        name: testCase.name,
        visibility: testCase.visibility,
        status: passed ? "passed" : "failed",
        expected: testCase.expected,
        actual: serializedActual,
        output: passed ? "Assertion passed." : "Assertion failed.",
        durationMs: Date.now() - testStartedAt
      });
    } catch (error) {
      compilerOutput = compilerOutput || formatError(error);
      results.push({
        id: testCase.id,
        name: testCase.name,
        visibility: testCase.visibility,
        status: "error",
        expected: testCase.expected,
        actual: formatError(error),
        output: "The submitted code could not be evaluated by the isolated worker.",
        durationMs: Date.now() - testStartedAt
      });
    }
  }

  const visibleResults = results.filter((result) => result.visibility === "visible");
  const hiddenResults = results.filter((result) => result.visibility === "hidden");

  return {
    passed: results.length > 0 && results.every((result) => result.status === "passed"),
    visiblePassed: visibleResults.filter((result) => result.status === "passed").length,
    visibleTotal: visibleResults.length,
    hiddenPassed: hiddenResults.filter((result) => result.status === "passed").length,
    hiddenTotal: hiddenResults.length,
    results,
    consoleOutput: consoleOutput.slice(0, 50),
    compilerOutput,
    durationMs: Date.now() - startedAt,
    provider: "javascript-child-process"
  };
}

function createContext(consoleOutput) {
  const sandbox = {
    console: {
      log: (...values) => consoleOutput.push(values.map(stableStringify).join(" ")),
      error: (...values) => consoleOutput.push(values.map(stableStringify).join(" ")),
      warn: (...values) => consoleOutput.push(values.map(stableStringify).join(" "))
    },
    globalThis: {}
  };
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox, {
    codeGeneration: {
      strings: false,
      wasm: false
    }
  });
}

function stableStringify(value) {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function formatError(error) {
  if (!error) {
    return "Unknown execution error.";
  }
  return String(error.stack || error.message || error).slice(0, 1000);
}
