import { z } from "zod";
import { env } from "../config.js";
import { buildSocraticPrompt } from "./prompt.js";
import { GeminiProvider, StaticHintProvider } from "./providers.js";
import type { AiCoachContext, AiGatewayResult, AiProvider } from "./types.js";

const outputSchema = z.string().trim().min(1).max(700);

export function createAiProvider(context: AiCoachContext): AiProvider {
  if (env.AI_PROVIDER === "static" || !env.GEMINI_API_KEY) {
    return new StaticHintProvider(context.fallback);
  }

  return new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL);
}

export async function generateCoachingResponse(context: AiCoachContext, provider = createAiProvider(context)): Promise<AiGatewayResult> {
  const prompt = buildSocraticPrompt(context);
  const fallback = sanitizeAiOutput(context.fallback, context);

  if (provider.name === "static") {
    return { text: fallback, provider: provider.name, fallback: true };
  }

  for (let attempt = 0; attempt <= env.AI_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

    try {
      const result = await provider.generate({ prompt, timeoutMs: env.AI_TIMEOUT_MS }, controller.signal);
      const sanitized = sanitizeAiOutputResult(result.text, context);
      clearTimeout(timeout);
      return { text: sanitized.text, provider: provider.name, fallback: sanitized.usedFallback };
    } catch {
      clearTimeout(timeout);
    }
  }

  return { text: fallback, provider: provider.name, fallback: true };
}

export function sanitizeAiOutput(value: string, context: Pick<AiCoachContext, "fallback" | "correctFix">): string {
  return sanitizeAiOutputResult(value, context).text;
}

function sanitizeAiOutputResult(
  value: string,
  context: Pick<AiCoachContext, "fallback" | "correctFix">
): { text: string; usedFallback: boolean } {
  const normalized = String(value || "")
    .replace(/```[\s\S]*?```/g, "[code hidden]")
    .replace(/\s+/g, " ")
    .trim();
  const withoutFix = context.correctFix
    ? normalized.replaceAll(context.correctFix.replace(/\s+/g, " ").trim(), "[answer hidden]")
    : normalized;
  const candidate = withoutFix.slice(0, 700);
  const parsed = outputSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      text: String(context.fallback || "Inspect the failing line and compare what it does with what the function name promises.").slice(0, 700),
      usedFallback: true
    };
  }

  return { text: parsed.data, usedFallback: false };
}
