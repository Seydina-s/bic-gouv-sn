import { describe, expect, it } from "vitest";
import { FailureLog, type PassFailure } from "./failure-log";

const quarantined = (ref: string) => ({ code: "INGESTION_QUARANTINED", ref });
const site = (source: string, ...failures: PassFailure[]) => ({ source, failures });
const NIGHT = new Date("2026-11-03T02:00:00Z");
const LATER = new Date("2026-11-03T02:30:00Z");
const NEXT_DAY = new Date("2026-11-04T02:00:00Z");

describe("the failures the watcher writes", () => {
  it("writes a failure when it appears, not again at each pass", () => {
    const log = new FailureLog();
    const pass = [site("presidence.sn", quarantined("a"), quarantined("b"))];
    expect(log.lines(pass, NIGHT)).toEqual([
      "✗ INGESTION_QUARANTINED a",
      "✗ INGESTION_QUARANTINED b",
    ]);
    expect(log.lines(pass, LATER)).toEqual([]);
  });

  it("writes a new failure among known ones, and the ones that are gone", () => {
    const log = new FailureLog();
    log.lines([site("presidence.sn", quarantined("a"), quarantined("b"))], NIGHT);
    expect(log.lines([site("presidence.sn", quarantined("b"), quarantined("c"))], LATER)).toEqual([
      "✗ INGESTION_QUARANTINED c",
      "✓ no longer failing: INGESTION_QUARANTINED a",
    ]);
  });

  it("keeps the failures of a site that this pass did not read (03/11/2026)", () => {
    // Each pass reads the reference sites and one ministry site in turn: until this
    // fix, a ministry's failures were written as gone at every pass that skipped it.
    const log = new FailureLog();
    log.lines([site("presidence.sn"), site("interieur.gouv.sn", quarantined("d"))], NIGHT);
    expect(log.lines([site("presidence.sn"), site("sante.gouv.sn")], LATER)).toEqual([]);
    expect(log.lines([site("presidence.sn"), site("interieur.gouv.sn")], LATER)).toEqual([
      "✓ no longer failing: INGESTION_QUARANTINED d",
    ]);
  });

  it("reminds once a day of the failures that remain, on every site", () => {
    const log = new FailureLog();
    log.lines(
      [
        site("presidence.sn", quarantined("a"), { code: "MEDIA_PROCESSING_FAILED", ref: "x" }),
        site("interieur.gouv.sn", quarantined("b")),
      ],
      NIGHT,
    );
    const pass = [
      site("presidence.sn", quarantined("a"), { code: "MEDIA_PROCESSING_FAILED", ref: "x" }),
    ];
    expect(log.lines(pass, NEXT_DAY)).toEqual([
      "✗ still failing: 3 (INGESTION_QUARANTINED 2, MEDIA_PROCESSING_FAILED 1)",
    ]);
    expect(log.lines(pass, NEXT_DAY)).toEqual([]);
  });

  it("writes nothing when all is well", () => {
    expect(new FailureLog().lines([site("presidence.sn")], NIGHT)).toEqual([]);
  });
});
