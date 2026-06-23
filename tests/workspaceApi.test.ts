import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { runTestsSchema } from "../server/routes/workspace.js";

const sessionId = "00000000-0000-4000-8000-000000000001";

describe("workspace API", () => {
  it("requires authentication before running server tests", async () => {
    const app = createApp();

    await request(app)
      .post("/api/workspace/run-tests")
      .send({
        gameSessionId: sessionId,
        code: "function add(a, b) { return a + b; }"
      })
      .expect(401);
  });

  it("rejects forged execution outcomes in run-test requests", () => {
    expect(() =>
      runTestsSchema.parse({
        gameSessionId: sessionId,
        code: "function add(a, b) { return a + b; }",
        passed: true,
        scoreAwarded: 999999,
        xpAwarded: 999999,
        completionStatus: "COMPLETED"
      })
    ).toThrow();
  });
});
