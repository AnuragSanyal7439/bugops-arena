import type { Prisma, PrismaClient } from "@prisma/client";

const sensitiveKeyPattern = /code|source|answer|token|secret|password|email|name|cookie|session/i;
const allowedEventNames = new Set([
  "session_started",
  "tests_run",
  "hint_requested",
  "submission_recorded",
  "leaderboard_viewed",
  "engagement_viewed",
  "profile_viewed"
]);

export type AnalyticsClient = Pick<PrismaClient, "analyticsEvent"> | Prisma.TransactionClient;

export function sanitizeAnalyticsProperties(input: unknown): Prisma.InputJsonObject {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const properties = Object.entries(input as Record<string, unknown>).reduce<Record<string, Prisma.InputJsonValue>>((accumulator, [key, value]) => {
    if (sensitiveKeyPattern.test(key)) {
      return accumulator;
    }

    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) {
      accumulator[key] = sanitized;
    }
    return accumulator;
  }, {});

  return properties as Prisma.InputJsonObject;
}

export async function recordAnalyticsEvent(
  client: AnalyticsClient,
  input: {
    userId?: string | null;
    gameSessionId?: string | null;
    eventName: string;
    properties?: unknown;
  }
): Promise<void> {
  const eventName = allowedEventNames.has(input.eventName) ? input.eventName : "engagement_viewed";
  await client.analyticsEvent.create({
    data: {
      userId: input.userId || null,
      gameSessionId: input.gameSessionId || null,
      eventName,
      properties: sanitizeAnalyticsProperties(input.properties)
    }
  });
}

function sanitizeValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (typeof value === "string") {
    return value.slice(0, 96);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined)
      .slice(0, 12);
  }
  if (value && typeof value === "object") {
    return sanitizeAnalyticsProperties(value);
  }
  return undefined;
}
