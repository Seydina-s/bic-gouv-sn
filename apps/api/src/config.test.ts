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
    });
  });

  it("reads values from the environment", () => {
    expect(loadConfig({ PORT: "8080", NODE_ENV: "production" })).toMatchObject({
      PORT: 8080,
      NODE_ENV: "production",
    });
  });

  it("fails fast with a readable message on invalid values", () => {
    expect(() => loadConfig({ PORT: "70000" })).toThrow(ConfigError);
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });
});
