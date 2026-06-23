import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler } from "../http/errors.js";
import { recordAnalyticsEvent, sanitizeAnalyticsProperties } from "../services/analytics.js";

export const analyticsRouter = Router();

export const analyticsEventSchema = z
  .object({
    eventName: z
      .enum([
        "session_started",
        "tests_run",
        "hint_requested",
        "submission_recorded",
        "leaderboard_viewed",
        "engagement_viewed",
        "profile_viewed"
      ])
      .default("engagement_viewed"),
    gameSessionId: z.string().uuid().optional(),
    properties: z.record(z.unknown()).optional()
  })
  .strict();

analyticsRouter.post(
  "/api/analytics/events",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = analyticsEventSchema.parse(req.body);
    await recordAnalyticsEvent(prisma, {
      userId,
      gameSessionId: body.gameSessionId,
      eventName: body.eventName,
      properties: sanitizeAnalyticsProperties(body.properties)
    });
    res.status(202).json({ data: { accepted: true } });
  })
);
