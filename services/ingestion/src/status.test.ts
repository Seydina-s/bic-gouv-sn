import { describe, expect, it } from "vitest";
import { nextIngestionStatus } from "./status";
import type { PollResult } from "./watch";

const T1 = new Date("2026-09-26T10:00:00Z");
const T2 = new Date("2026-09-26T10:01:00Z");

function pass(overrides: Partial<PollResult> = {}): { result: PollResult } {
  return {
    result: {
      outcomes: { created: 0, updated: 0, unchanged: 5, ...overrides.outcomes },
      failures: overrides.failures ?? [],
      detectionDelays: overrides.detectionDelays ?? [],
    },
  };
}

describe("nextIngestionStatus", () => {
  it("records a quiet successful pass", () => {
    expect(nextIngestionStatus(null, pass(), T1)).toEqual({
      checkedAt: T1.toISOString(),
      lastSuccessAt: T1.toISOString(),
      lastChangeAt: null,
      lastDetectionSeconds: null,
      consecutiveFailures: 0,
      lastFailure: null,
    });
  });

  it("records a new article and how fast it was detected while watching", () => {
    const watching = nextIngestionStatus(null, pass(), T1);
    const status = nextIngestionStatus(
      watching,
      pass({ outcomes: { created: 1, updated: 1, unchanged: 0 }, detectionDelays: [30, 45] }),
      T2,
    );
    expect(status).toMatchObject({ lastChangeAt: T2.toISOString(), lastDetectionSeconds: 45 });
  });

  it("does not count a catch-up of old changes as a detection time (regression 26/09)", () => {
    // First pass after a start: a year-old edit is saved, but it says nothing about speed.
    const status = nextIngestionStatus(
      null,
      pass({ outcomes: { created: 0, updated: 1, unchanged: 0 }, detectionDelays: [31_102_966] }),
      T1,
    );
    expect(status).toMatchObject({ lastChangeAt: T1.toISOString(), lastDetectionSeconds: null });
  });

  it("counts failing passes in a row, and resets them on the next success", () => {
    const down = { error: { code: "INGESTION_SOURCE_UNREACHABLE" } };
    const first = nextIngestionStatus(nextIngestionStatus(null, pass(), T1), down, T2);
    const second = nextIngestionStatus(first, down, T2);
    expect(second).toMatchObject({
      lastSuccessAt: T1.toISOString(),
      consecutiveFailures: 2,
      lastFailure: { code: "INGESTION_SOURCE_UNREACHABLE", at: T2.toISOString() },
    });
    expect(nextIngestionStatus(second, pass(), T2).consecutiveFailures).toBe(0);
  });

  it("does not treat one quarantined article as a collection failure", () => {
    const status = nextIngestionStatus(
      null,
      pass({
        failures: [{ ref: "x", code: "INGESTION_QUARANTINED", message: "empty" }],
      }),
      T1,
    );
    expect(status).toMatchObject({
      consecutiveFailures: 0,
      lastSuccessAt: T1.toISOString(),
      lastFailure: { code: "INGESTION_QUARANTINED" },
    });
    const allFailed = nextIngestionStatus(
      null,
      pass({
        outcomes: { created: 0, updated: 0, unchanged: 0 },
        failures: [{ ref: "x", code: "INGESTION_SOURCE_UNREACHABLE", message: "down" }],
      }),
      T1,
    );
    expect(allFailed.consecutiveFailures).toBe(1);
  });
});
