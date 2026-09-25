import type { ErrorCode } from "@bgs/shared-types";
import { z } from "zod";

/** Every setting comes from environment variables; secrets are never hard-coded. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Grace period for in-flight requests on shutdown before forcing exit. */
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /** Sentry project key; crash reporting stays off while it is absent. */
  SENTRY_DSN: z.url({ protocol: /^https$/ }).optional(),
  /** Share of requests traced for performance (0 to 1); errors are always reported. */
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.02),
});

export type Config = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  readonly code: ErrorCode = "API_CONFIG_INVALID";
}

export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new ConfigError(`Invalid API configuration: ${details}`);
  }
  return result.data;
}
