import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMOTE_CONFIG,
  isOlderVersion,
  readRemoteConfig,
  remoteConfigSchema,
} from "./remote-config.schema";

describe("remote config", () => {
  it("is read leniently by installed apps: unknown ignored, missing on, junk harmless", () => {
    expect(
      readRemoteConfig({ minVersion: "1.2.0", features: { map: false, futureThing: false } }),
    ).toEqual({
      minVersion: "1.2.0",
      features: {
        nearMe: true,
        map: false,
        readAloud: true,
        procedures: true,
        participate: true,
        assistant: true,
      },
    });
    expect(readRemoteConfig({ minVersion: "latest", features: "none" })).toEqual(
      DEFAULT_REMOTE_CONFIG,
    );
    expect(readRemoteConfig(null)).toEqual(DEFAULT_REMOTE_CONFIG);
  });

  it("is written strictly: every feature, a real version number", () => {
    expect(remoteConfigSchema.safeParse(DEFAULT_REMOTE_CONFIG).success).toBe(true);
    expect(remoteConfigSchema.safeParse({ minVersion: "v2", features: {} }).success).toBe(false);
  });

  it("compares versions number by number", () => {
    expect(isOlderVersion("1.2.0", "1.10.0")).toBe(true);
    expect(isOlderVersion("1.10.0", "1.2.0")).toBe(false);
    expect(isOlderVersion("2.0.0", "2.0.0")).toBe(false);
    expect(isOlderVersion("0.0.0", "0.0.1")).toBe(true);
  });
});
