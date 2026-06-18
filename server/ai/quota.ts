import type { Prisma } from "@prisma/client";
import { env } from "../config.js";
import { HttpError } from "../http/errors.js";

export async function reserveAiUsage(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    gameSessionId: string;
    kind: "hint" | "explanation";
    provider: string;
    now?: Date;
  }
): Promise<string> {
  const now = input.now || new Date();
  const minuteStart = new Date(now.getTime() - 60_000);
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  const [minuteCount, dayCount] = await Promise.all([
    tx.aiUsageEvent.count({
      where: {
        userId: input.userId,
        createdAt: { gte: minuteStart }
      }
    }),
    tx.aiUsageEvent.count({
      where: {
        userId: input.userId,
        createdAt: { gte: dayStart }
      }
    })
  ]);

  if (minuteCount >= env.AI_RATE_LIMIT_PER_MINUTE) {
    throw new HttpError(429, "AI rate limit exceeded. Try again shortly.", "ai_rate_limited");
  }

  if (dayCount >= env.AI_DAILY_QUOTA) {
    throw new HttpError(429, "Daily AI quota exceeded.", "ai_quota_exceeded");
  }

  const usage = await tx.aiUsageEvent.create({
    data: {
      userId: input.userId,
      gameSessionId: input.gameSessionId,
      kind: input.kind === "hint" ? "HINT" : "EXPLANATION",
      provider: input.provider
    }
  });

  return usage.id;
}
