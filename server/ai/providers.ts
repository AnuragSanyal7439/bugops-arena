import { z } from "zod";
import type { AiProvider, AiProviderRequest, AiProviderResult } from "./types.js";

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })).optional()
          })
          .optional()
      })
    )
    .optional()
});

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async generate(request: AiProviderRequest, signal: AbortSignal): Promise<AiProviderResult> {
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 160
          }
        }),
        signal
      }
    );

    if (!response.ok) {
      throw new Error(`AI provider failed with ${response.status}`);
    }

    const parsed = geminiResponseSchema.parse(await response.json());
    const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim() || "";
    return { text };
  }
}

export class StaticHintProvider implements AiProvider {
  readonly name = "static";

  constructor(private readonly fallback: string) {}

  async generate(): Promise<AiProviderResult> {
    return { text: this.fallback };
  }
}
