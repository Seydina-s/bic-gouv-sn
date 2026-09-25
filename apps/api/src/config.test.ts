import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

describe("loadConfig", () => {
  it("applies safe defaults", () => {
    expect(loadConfig({})).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 3000,
      LOG_LEVEL: "info",
      SHUTDOWN_TIMEOUT_MS: 10_000,
      RATE_LIMIT_PER_MINUTE: 600,
      NEWS_STORE_PATH: ".data/news.json",
      MEDIA_ROOT: ".data/media",
      SENTRY_TRACES_SAMPLE_RATE: 0.02,
    });
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
