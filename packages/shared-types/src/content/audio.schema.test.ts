import { describe, expect, it } from "vitest";
import { audioTrack } from "../testing/fixtures";
import { audioTrackSchema } from "./audio.schema";

describe("audioTrackSchema", () => {
  it("accepts a generated Wolof track", () => {
    expect(audioTrackSchema.safeParse(audioTrack({ lang: "wo" })).success).toBe(true);
  });

  it("rejects unsupported formats and empty durations", () => {
    expect(audioTrackSchema.safeParse(audioTrack({ format: "wav" })).success).toBe(false);
    expect(audioTrackSchema.safeParse(audioTrack({ durationMs: 0 })).success).toBe(false);
  });
});
