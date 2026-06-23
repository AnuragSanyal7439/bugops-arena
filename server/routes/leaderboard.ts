import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { getMonthStart, getWeekStart } from "../game/engagement.js";
import { getAccuracy } from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler, HttpError } from "../http/errors.js";

export const leaderboardRouter = Router();

export const submitLeaderboardSchema = z
  .object({
    gameSessionId: z.string().uuid(),
    username: z.string().trim().min(1).max(18).regex(/^[a-zA-Z0-9 _.-]+$/)
  })
  .strict();

export const leaderboardQuerySchema = z
  .object({
    scope: z.enum(["weekly", "monthly", "all_time"]).default("all_time")
  })
  .strict();

leaderboardRouter.get(
  "/api/leaderboard",
  asyncHandler(async (req, res) => {
    const query = leaderboardQuerySchema.parse(req.query);
    const now = new Date();
    const createdAt =
      query.scope === "weekly"
        ? { gte: getWeekStart(now) }
        : query.scope === "monthly"
          ? { gte: getMonthStart(now) }
          : undefined;
    const entries = await prisma.leaderboard.findMany({
      where: createdAt ? { createdAt } : undefined,
      orderBy: [{ score: "desc" }, { timeTaken: "asc" }, { accuracy: "desc" }, { createdAt: "asc" }],
      take: 12,
      select: {
        id: true,
        username: true,
        score: true,
        xp: true,
        accuracy: true,
        timeTaken: true,
        difficulty: true,
        createdAt: true
      }
    });

    res.json({ data: { scope: query.scope, entries } });
  })
);

leaderboardRouter.post(
  "/api/leaderboard",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = submitLeaderboardSchema.parse(req.body);
    const session = await prisma.gameSession.findFirst({
      where: { id: body.gameSessionId, userId }
    });

    if (!session) {
      throw new HttpError(404, "Game session not found.", "session_not_found");
    }

    if (session.status !== "COMPLETED" && session.status !== "LOCKED") {
      throw new HttpError(409, "Only server-completed runs can be submitted.", "session_not_complete");
    }

    const entry = await prisma.leaderboard.upsert({
      where: { gameSessionId: session.id },
      create: {
        userId,
        gameSessionId: session.id,
        username: body.username,
        score: session.score,
        xp: session.xp,
        accuracy: getAccuracy(session.correct, session.attempts),
        timeTaken: session.timeSpentSeconds,
        difficulty: session.selectedDifficulty
      },
      update: {
        username: body.username,
        score: session.score,
        xp: session.xp,
        accuracy: getAccuracy(session.correct, session.attempts),
        timeTaken: session.timeSpentSeconds,
        difficulty: session.selectedDifficulty
      }
    });

    res.status(201).json({ data: { entry } });
  })
);
