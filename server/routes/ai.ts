import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateCoachingResponse } from "../ai/gateway.js";
import { reserveAiUsage } from "../ai/quota.js";
import { incrementHintCount } from "../game/rules.js";
import { currentUserId, requireAuth } from "../http/auth.js";
import { asyncHandler, HttpError } from "../http/errors.js";
import { env } from "../config.js";
import { recordAnalyticsEvent } from "../services/analytics.js";

export const aiRouter = Router();

const aiHintSchema = z
  .object({
    gameSessionId: z.string().uuid(),
    kind: z.enum(["hint", "explanation"]).default("hint")
  })
  .strict();

aiRouter.post(
  "/api/ai/hint",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = aiHintSchema.parse(req.body);
    const providerName = env.AI_PROVIDER === "static" || !env.GEMINI_API_KEY ? "static" : "gemini";

    const context = await prisma.$transaction(async (tx) => {
      const gameSession = await tx.gameSession.findFirst({
        where: { id: body.gameSessionId, userId }
      });

      if (!gameSession) {
        throw new HttpError(404, "Game session not found.", "session_not_found");
      }

      await tx.$executeRaw`SELECT 1 FROM "GameSession" WHERE "id" = ${gameSession.id}::uuid FOR UPDATE`;

      if (gameSession.status !== "IN_PROGRESS") {
        throw new HttpError(409, "Hints are only available during an active run.", "session_closed");
      }

      if (gameSession.noHintMode && body.kind === "hint") {
        throw new HttpError(409, "Hints are disabled for this no-hint run.", "no_hint_mode");
      }

      const challengeId = gameSession.challengeIds[gameSession.currentChallengeIndex];
      if (!challengeId) {
        throw new HttpError(409, "No active challenge exists for this session.", "no_active_challenge");
      }

      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: {
          versions: {
            where: { isActive: true },
            orderBy: { version: "desc" },
            take: 1
          }
        }
      });

      const activeVersion = challenge?.versions[0];
      if (!challenge || !activeVersion) {
        throw new HttpError(404, "Active challenge not found.", "challenge_not_found");
      }

      const usageId = await reserveAiUsage(tx, {
        userId,
        gameSessionId: gameSession.id,
        kind: body.kind,
        provider: providerName
      });

      const nextHintCounts = body.kind === "hint" ? incrementHintCount(gameSession.hintCounts, challenge.id) : null;
      const updatedSession =
        body.kind === "hint"
          ? await tx.gameSession.update({
              where: { id: gameSession.id },
              data: {
                hintsUsed: { increment: 1 },
                hintCounts: nextHintCounts || {}
              }
            })
          : gameSession;
      const hintCountForChallenge =
        body.kind === "hint" && nextHintCounts ? nextHintCounts[String(challenge.id)] || 1 : 0;
      const hints = Array.isArray(activeVersion.hints)
        ? activeVersion.hints.filter((hint): hint is string => typeof hint === "string")
        : [];
      const fallbackHint = hints[Math.min(4, Math.max(0, hintCountForChallenge - 1))] || activeVersion.hint;

      return {
        usageId,
        gameSessionId: gameSession.id,
        mode: gameSession.mode,
        trackId: gameSession.trackId,
        language: challenge.language,
        topic: challenge.topic,
        buggyCode: activeVersion.buggyCode,
        correctFix: activeVersion.correctFix,
        hintsUsed: updatedSession.hintsUsed,
        hintCountForChallenge,
        fallback: body.kind === "hint" ? fallbackHint : activeVersion.rootCause || activeVersion.explanation,
        kind: body.kind
      };
    });

    const gatewayResult = await generateCoachingResponse({
      kind: context.kind,
      language: context.language,
      topic: context.topic,
      buggyCode: context.buggyCode,
      correctFix: context.correctFix,
      fallback: context.fallback,
      hintCount: context.hintCountForChallenge
    });

    await prisma.aiUsageEvent
      .update({
        where: { id: context.usageId },
        data: {
          provider: gatewayResult.provider,
          success: !gatewayResult.fallback,
          usedFallback: gatewayResult.fallback
        }
      })
      .catch(() => undefined);

    await recordAnalyticsEvent(prisma, {
      userId,
      gameSessionId: context.gameSessionId,
      eventName: "hint_requested",
      properties: {
        kind: context.kind,
        mode: context.mode,
        trackId: context.trackId || "none",
        provider: gatewayResult.provider,
        fallback: gatewayResult.fallback,
        hintCount: context.hintCountForChallenge
      }
    }).catch(() => undefined);

    res.json({
      data: {
        text: gatewayResult.text,
        fallback: gatewayResult.fallback,
        hintsUsed: context.hintsUsed
      }
    });
  })
);
