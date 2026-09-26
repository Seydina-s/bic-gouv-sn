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
  /** Requests allowed per minute and per client address (generous: carrier-grade NAT). */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
  /** Provisional article store written by the ingestion job (PostgreSQL in Phase 1). */
  NEWS_STORE_PATH: z.string().min(1).default(".data/news.json"),
  /** Report written by the real-time collection after each pass (console supervision). */
  INGESTION_STATUS_PATH: z.string().min(1).default(".data/ingestion-status.json"),
  /** Folder of processed media (cover photos) written by the ingestion job. */
  MEDIA_ROOT: z.string().min(1).default(".data/media"),
  /**
   * Public address of those media (a CDN in production). Absent: served by this API
   * under /media, at the address the request came in on (local development).
   */
  MEDIA_BASE_URL: z
    .url({ protocol: /^https$/ })
    .transform((url) => url.replace(/\/+$/, ""))
    .optional(),
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
