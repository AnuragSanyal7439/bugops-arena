export type AiCoachKind = "hint" | "explanation";

export type AiCoachContext = {
  kind: AiCoachKind;
  language: string;
  topic: string;
  buggyCode: string;
  fallback: string;
  correctFix?: string;
  hintCount: number;
};

export type AiProviderRequest = {
  prompt: string;
  timeoutMs: number;
};

export type AiProviderResult = {
  text: string;
};

export interface AiProvider {
  readonly name: string;
  generate(request: AiProviderRequest, signal: AbortSignal): Promise<AiProviderResult>;
}

export type AiGatewayResult = {
  text: string;
  provider: string;
  fallback: boolean;
};
