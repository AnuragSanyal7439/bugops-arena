import { describe, expect, it } from "vitest";
import { reserveAiUsage } from "../server/ai/quota.js";

const userId = "00000000-0000-4000-8000-000000000001";
const gameSessionId = "00000000-0000-4000-8000-000000000002";

describe("AI quotas", () => {
  it("rejects users over the per-minute limit", async () => {
    const tx = createTx({ minuteCount: 8, dayCount: 8 });

    await expect(
      reserveAiUsage(tx, {
        userId,
        gameSessionId,
        kind: "hint",
        provider: "gemini"
      })
    ).rejects.toMatchObject({ status: 429, code: "ai_rate_limited" });
  });

  it("rejects users over the daily quota", async () => {
    const tx = createTx({ minuteCount: 0, dayCount: 60 });

    await expect(
      reserveAiUsage(tx, {
        userId,
        gameSessionId,
        kind: "explanation",
        provider: "gemini"
      })
    ).rejects.toMatchObject({ status: 429, code: "ai_quota_exceeded" });
  });

  it("reserves usage when below limits", async () => {
    const tx = createTx({ minuteCount: 1, dayCount: 5 });

    await expect(
      reserveAiUsage(tx, {
        userId,
        gameSessionId,
        kind: "hint",
        provider: "gemini"
      })
    ).resolves.toBe("usage-1");
  });
});

function createTx(input: { minuteCount: number; dayCount: number }) {
  let countCall = 0;
  return {
    aiUsageEvent: {
      count: async () => {
        countCall += 1;
        return countCall === 1 ? input.minuteCount : input.dayCount;
      },
      create: async () => ({ id: "usage-1" })
    }
  } as any;
}
