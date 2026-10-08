import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";
import { join } from "node:path";
import { workspaceRoot } from "./data-path";

/** Data paths are resolved from the project root, wherever the tests start. */
const fromRoot = (path: string) => join(workspaceRoot(process.cwd()) ?? "", path);

describe("loadConfig", () => {
  it("applies safe defaults", () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 3000,
      LOG_LEVEL: "info",
      SHUTDOWN_TIMEOUT_MS: 10_000,
      RATE_LIMIT_PER_MINUTE: 600,
      NEWS_STORE_PATH: fromRoot(".data/news.json"),
      PROCEDURES_STORE_PATH: fromRoot(".data/procedures.json"),
      PROCEDURE_THEMES_PATH: fromRoot(".data/procedure-themes.json"),
      MAP_TILES_PATH: fromRoot(".data/tiles/senegal.pmtiles"),
      MAP_ASSETS_ROOT: fromRoot(".data/map"),
      STATE_SERVICES_PATH: fromRoot(".data/state-services.json"),
      REMOTE_CONFIG_PATH: fromRoot(".data/remote-config.json"),
      ERROR_JOURNAL_PATH: fromRoot(".data/error-journal.json"),
      PUSH_PROVIDER: "none",
      PUSH_SUBSCRIPTIONS_PATH: fromRoot(".data/push-subscriptions.json"),
      USAGE_STATS_PATH: fromRoot(".data/usage-stats.json"),
      SEARCH_MISSES_PATH: fromRoot(".data/search-misses.json"),
      SETTINGS_PATH: fromRoot(".data/admin/settings.json"),
      AUTO_NOTIFICATIONS_PER_HOUR: 10,
      TRUST_PROXY: false,
      PARTICIPATION_PATH: fromRoot(".data/participation.json"),
      PARTICIPATION_PHOTOS_ROOT: fromRoot(".data/participation-photos"),
      OPPORTUNITIES_PATH: fromRoot(".data/opportunities.json"),
      NOTIFICATIONS_PATH: fromRoot(".data/admin/notifications.json"),
      INGESTION_STATUS_PATH: fromRoot(".data/ingestion-status.json"),
      MEDIA_ROOT: fromRoot(".data/media"),
      ADMIN_SECRET_KEYS_PREVIOUS: [],
      ADMIN_ACCOUNTS_PATH: fromRoot(".data/admin/accounts.json"),
      ADMIN_AUDIT_PATH: fromRoot(".data/admin/audit.jsonl"),
      ASSISTANT_MODEL: "claude-haiku-4-5-20251001",
      ASSISTANT_SEMANTIC_SEARCH: "off",
      ASSISTANT_VECTORS_ROOT: fromRoot(".data/assistant"),
      SENTRY_TRACES_SAMPLE_RATE: 0.02,
    });
  });

  it("accepts an admin key of 32 bytes only", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    expect(loadConfig({ ADMIN_SECRET_KEY: key }).ADMIN_SECRET_KEY).toBe(key);
    expect(() => loadConfig({ ADMIN_SECRET_KEY: Buffer.alloc(16).toString("base64") })).toThrow(
      /ADMIN_SECRET_KEY/,
    );
    expect(() => loadConfig({ ADMIN_SECRET_KEY: "pas du base64 !" })).toThrow(/ADMIN_SECRET_KEY/);
  });

  it("reads values from the environment", () => {
    expect(loadConfig({ PORT: "8080", NODE_ENV: "production" })).toMatchObject({
      PORT: 8080,
      NODE_ENV: "production",
    });
  });

  it("normalizes the media address and refuses plain http for it", () => {
    expect(loadConfig({ MEDIA_BASE_URL: "https://cdn.example.org/media/" }).MEDIA_BASE_URL).toBe(
      "https://cdn.example.org/media",
    );
    expect(() => loadConfig({ MEDIA_BASE_URL: "http://cdn.example.org" })).toThrow(
      /MEDIA_BASE_URL/,
    );
  });

  it("fails fast with a readable message on invalid values", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });
});
