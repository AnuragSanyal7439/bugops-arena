import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4173),
  DATABASE_URL: z.string().default("postgresql://bugops:bugops@localhost:5432/bugops"),
  SESSION_SECRET: z.string().min(32).default("dev-only-change-me-bugops-session-secret"),
  APP_ORIGIN: z.string().url().default("http://localhost:4173"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash-latest"),
  AI_PROVIDER: z.enum(["gemini", "static"]).default("gemini"),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(8),
  AI_DAILY_QUOTA: z.coerce.number().int().positive().default(60),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  AI_MAX_RETRIES: z.coerce.number().int().nonnegative().max(3).default(1)
});

export const env = envSchema.parse(process.env);
process.env.DATABASE_URL = env.DATABASE_URL;

if (env.NODE_ENV === "production" && env.SESSION_SECRET === "dev-only-change-me-bugops-session-secret") {
  throw new Error("SESSION_SECRET must be set to a strong secret in production.");
}

export const authProviders = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
};
