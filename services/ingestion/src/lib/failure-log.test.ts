import { describe, expect, it } from "vitest";
import { FailureLog } from "./failure-log";

const quarantined = (ref: string) => ({ code: "INGESTION_QUARANTINED", ref });
const NIGHT = new Date("2026-11-03T02:00:00Z");
const LATER = new Date("2026-11-03T02:30:00Z");
const NEXT_DAY = new Date("2026-11-04T02:00:00Z");

describe("the failures the watcher writes", () => {
  it("writes a failure when it appears, not again at each pass", () => {
    const log = new FailureLog();
    expect(log.lines([quarantined("a"), quarantined("b")], NIGHT)).toEqual([
      "✗ INGESTION_QUARANTINED a",
      "✗ INGESTION_QUARANTINED b",
    ]);
    expect(log.lines([quarantined("a"), quarantined("b")], LATER)).toEqual([]);
  });

  it("writes a new failure among known ones, and the ones that are gone", () => {
    const log = new FailureLog();
    log.lines([quarantined("a"), quarantined("b")], NIGHT);
    expect(log.lines([quarantined("b"), quarantined("c")], LATER)).toEqual([
      "✗ INGESTION_QUARANTINED c",
      "✓ no longer failing: INGESTION_QUARANTINED a",
    ]);
  });

  it("reminds once a day of the failures that remain", () => {
    const log = new FailureLog();
    const failures = [
      quarantined("a"),
      quarantined("b"),
      { code: "MEDIA_PROCESSING_FAILED", ref: "x" },
    ];
    log.lines(failures, NIGHT);
    expect(log.lines(failures, NEXT_DAY)).toEqual([
      "✗ still failing: 3 (INGESTION_QUARANTINED 2, MEDIA_PROCESSING_FAILED 1)",
    ]);
    expect(log.lines(failures, NEXT_DAY)).toEqual([]);
  });

  it("writes nothing when all is well", () => {
    expect(new FailureLog().lines([], NIGHT)).toEqual([]);
  });
});
