import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsProperties } from "../server/services/analytics.js";

describe("analytics sanitization", () => {
  it("removes sensitive fields and keeps bounded metadata", () => {
    const sanitized = sanitizeAnalyticsProperties({
      mode: "boss",
      score: 120,
      sourceCode: "function leaked() {}",
      answer: "return secret;",
      email: "player@example.com",
      nested: {
        token: "hidden",
        provider: "javascript-child-process"
      },
      longValue: "x".repeat(200)
    });

    expect(sanitized).toEqual({
      mode: "boss",
      score: 120,
      nested: {
        provider: "javascript-child-process"
      },
      longValue: "x".repeat(96)
    });
  });
});
