import type { ErrorCode } from "@bgs/shared-types";
import { z } from "zod";
import { resolveDataPath } from "./data-path";

/** Every setting comes from environment variables; secrets are never hard-coded. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  /** Grace period for in-flight requests on shutdown before forcing exit. */
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  /**
   * The proxies in front of the API (CDN, load balancer), so that each person's own
   * address is read from X-Forwarded-For: a number of hops ("1"), or a list of
   * addresses or ranges ("10.0.0.0/8,127.0.0.1"). None by default: behind a proxy,
   * every limit per address would count the whole country as one person.
   */
  TRUST_PROXY: z
    .string()
    .regex(/^(\d{1,2}|[0-9a-fA-F.:/,\s]+)$/)
    .optional()
    .transform((value): number | string[] | false => {
      if (value === undefined || value.trim() === "") {
        return false;
      }
      return /^\d+$/.test(value)
        ? Number(value)
        : value
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part !== "");
    }),
  /** Requests allowed per minute and per client address (generous: carrier-grade NAT). */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
  /** Provisional article store written by the ingestion job (PostgreSQL in Phase 1). */
  NEWS_STORE_PATH: z
    .string()
    .min(1)
    .default(".data/news.json")
    .transform((path) => resolveDataPath(path)),
  /** Provisional procedure store written by the e-senegal.sn collection. */
  PROCEDURES_STORE_PATH: z
    .string()
    .min(1)
    .default(".data/procedures.json")
    .transform((path) => resolveDataPath(path)),
  /** Official procedure themes and the theme of each procedure (validated in the console). */
  PROCEDURE_THEMES_PATH: z
    .string()
    .min(1)
    .default(".data/procedure-themes.json")
    .transform((path) => resolveDataPath(path)),
  /** Vector tiles of Senegal (PMTiles, Protomaps schema) for the base map. */
  MAP_TILES_PATH: z
    .string()
    .min(1)
    .default(".data/tiles/senegal.pmtiles")
    .transform((path) => resolveDataPath(path)),
  /** Glyphs and icons of the base map style (pnpm map:assets). */
  MAP_ASSETS_ROOT: z
    .string()
    .min(1)
    .default(".data/map")
    .transform((path) => resolveDataPath(path)),
  /** State services (imported proposals, verified in the console) and towns. */
  STATE_SERVICES_PATH: z
    .string()
    .min(1)
    .default(".data/state-services.json")
    .transform((path) => resolveDataPath(path)),
  /** Remote control of the apps: kill switches and minimum version (console). */
  REMOTE_CONFIG_PATH: z
    .string()
    .min(1)
    .default(".data/remote-config.json")
    .transform((path) => resolveDataPath(path)),
  /** Errors answered by the API, grouped, for the console's error journal. */
  ERROR_JOURNAL_PATH: z
    .string()
    .min(1)
    .default(".data/error-journal.json")
    .transform((path) => resolveDataPath(path)),
  /** Searches that found nothing, counted without anything about who searched. */
  SEARCH_MISSES_PATH: z
    .string()
    .min(1)
    .default(".data/search-misses.json")
    .transform((path) => resolveDataPath(path)),
  /**
   * Redis shared by the API instances (SCALE-01): console sessions, sign-in steps,
   * idempotency keys and the rate limit. Absent: kept in this process (one
   * instance). May carry a password: from the secret manager only.
   */
  REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),
  /**
   * PostgreSQL shared by the API instances (SCALE-02): anonymous usage counters
   * for now. Absent: kept in files (one instance). Carries a password: from the
   * secret manager only.
   */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  /**
   * Push service for approved notifications: "none" records them without sending;
   * "expo" sends through Expo's free service (once the app can receive them).
   */
  PUSH_PROVIDER: z.enum(["none", "expo"]).default("none"),
  /** Optional Expo access token (push security), from the secret manager only. */
  EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
  /** Sections each phone follows (push token, sections, quiet hours, language). */
  PUSH_SUBSCRIPTIONS_PATH: z
    .string()
    .min(1)
    .default(".data/push-subscriptions.json")
    .transform((path) => resolveDataPath(path)),
  /** Anonymous usage counters (ADM-12): nothing about who sent the signals. */
  USAGE_STATS_PATH: z
    .string()
    .min(1)
    .default(".data/usage-stats.json")
    .transform((path) => resolveDataPath(path)),
  /** Report written by the real-time collection after each pass (console supervision). */
  INGESTION_STATUS_PATH: z
    .string()
    .min(1)
    .default(".data/ingestion-status.json")
    .transform((path) => resolveDataPath(path)),
  /** Folder of processed media (cover photos) written by the ingestion job. */
  MEDIA_ROOT: z
    .string()
    .min(1)
    .default(".data/media")
    .transform((path) => resolveDataPath(path)),
  /**
   * Public address of those media (a CDN in production). Absent: served by this API
   * under /media, at the address the request came in on (local development).
   */
  MEDIA_BASE_URL: z
    .url({ protocol: /^https$/ })
    .transform((url) => url.replace(/\/+$/, ""))
    .optional(),
  /**
   * Key sealing the admin second-factor secrets (32 random bytes, base64). Absent:
   * the admin sign-in routes are not served at all (public API only).
   */
  ADMIN_SECRET_KEY: z
    .base64()
    .refine((key) => Buffer.from(key, "base64").length === 32, "must decode to 32 bytes")
    .optional(),
  /**
   * Keys replaced by ADMIN_SECRET_KEY, comma-separated, kept only while the secrets
   * they sealed are sealed again (admin:reseal); then removed (SEC-05).
   */
  ADMIN_SECRET_KEYS_PREVIOUS: z
    .string()
    .default("")
    .transform((list) =>
      list
        .split(",")
        .map((key) => key.trim())
        .filter((key) => key !== ""),
    )
    .pipe(
      z.array(
        z
          .base64()
          .refine((key) => Buffer.from(key, "base64").length === 32, "must decode to 32 bytes"),
      ),
    ),
  /** Provisional admin account store (PostgreSQL later). */
  ADMIN_ACCOUNTS_PATH: z
    .string()
    .min(1)
    .default(".data/admin/accounts.json")
    .transform((path) => resolveDataPath(path)),
  /** Settings changed in the console (the pause of the automatic notifications). */
  SETTINGS_PATH: z
    .string()
    .min(1)
    .default(".data/admin/settings.json")
    .transform((path) => resolveDataPath(path)),
  /** Automatic notifications of new articles per hour at most: beyond, not announced. */
  AUTO_NOTIFICATIONS_PER_HOUR: z.coerce.number().int().positive().default(10),
  /** Messages and reports sent from Participer (anonymous). */
  PARTICIPATION_PATH: z
    .string()
    .min(1)
    .default(".data/participation.json")
    .transform((path) => resolveDataPath(path)),
  /** Their photos: a private folder, never served to the public. */
  PARTICIPATION_PHOTOS_ROOT: z
    .string()
    .min(1)
    .default(".data/participation-photos")
    .transform((path) => resolveDataPath(path)),
  /** Opportunities prepared and published in the console (two-person rule). */
  OPPORTUNITIES_PATH: z
    .string()
    .min(1)
    .default(".data/opportunities.json")
    .transform((path) => resolveDataPath(path)),
  /** Notifications prepared and decided in the console (two-person rule). */
  NOTIFICATIONS_PATH: z
    .string()
    .min(1)
    .default(".data/admin/notifications.json")
    .transform((path) => resolveDataPath(path)),
  /** Append-only, hash-chained audit journal of the admin console. */
  ADMIN_AUDIT_PATH: z
    .string()
    .min(1)
    .default(".data/admin/audit.jsonl")
    .transform((path) => resolveDataPath(path)),
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
