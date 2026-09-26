import { describe, expect, it } from "vitest";
import {
  assessIngestion,
  ingestionStatusSchema,
  type IngestionStatus,
} from "./ingestion-status.schema";

const NOW = new Date("2026-09-26T12:00:00Z");

function status(overrides: Partial<IngestionStatus> = {}): IngestionStatus {
  return {
    checkedAt: "2026-09-26T11:59:00Z",
    lastSuccessAt: "2026-09-26T11:59:00Z",
    lastChangeAt: "2026-09-26T11:30:00Z",
    lastDetectionSeconds: 42,
    consecutiveFailures: 0,
    lastFailure: null,
    ...overrides,
  };
}

describe("assessIngestion", () => {
  it("is ok after a recent successful pass, and tolerates one failure", () => {
    expect(assessIngestion(status(), NOW)).toEqual({ state: "ok" });
    const oneFailure = status({
      consecutiveFailures: 1,
      lastFailure: { code: "INGESTION_SOURCE_UNREACHABLE", at: "2026-09-26T11:59:00Z" },
    });
    expect(assessIngestion(oneFailure, NOW)).toEqual({ state: "ok" });
  });

  it("reports failing passes in a row, since the last success", () => {
    const failing = status({
      lastSuccessAt: "2026-09-26T11:50:00Z",
      consecutiveFailures: 3,
      lastFailure: { code: "INGESTION_SOURCE_UNREACHABLE", at: "2026-09-26T11:59:00Z" },
    });
    expect(assessIngestion(failing, NOW)).toEqual({
      state: "failing",
      code: "INGESTION_SOURCE_UNREACHABLE",
      since: "2026-09-26T11:50:00Z",
    });
  });

  it("reports a stopped collection when no pass happened for 15 minutes", () => {
    expect(assessIngestion(status({ checkedAt: "2026-09-26T11:40:00Z" }), NOW)).toEqual({
      state: "stopped",
      since: "2026-09-26T11:40:00Z",
    });
  });

  it("says unknown before any report exists", () => {
    expect(assessIngestion(null, NOW)).toEqual({ state: "unknown" });
  });

  it("validates the report format", () => {
    expect(ingestionStatusSchema.safeParse(status()).success).toBe(true);
    expect(ingestionStatusSchema.safeParse(status({ consecutiveFailures: -1 })).success).toBe(
      false,
    );
  });
});
