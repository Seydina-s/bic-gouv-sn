import type { ErrorJournalEntry, IngestionStatus } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { COLLECTION_PLACE, journalRows } from "./error-journal";

const NOW = new Date("2026-09-28T02:00:00Z");

function entry(code: string, lastAt: string, count = 1): ErrorJournalEntry {
  return { code, where: "GET /v1/news", count, firstAt: lastAt, lastAt, lastRequestId: "r1" };
}

describe("console error journal", () => {
  it("shows what still happens first, then the most serious, then the latest", () => {
    const rows = journalRows(
      [
        entry("ROUTE_NOT_FOUND", "2026-09-28T01:59:00Z", 12),
        entry("INTERNAL_ERROR", "2026-09-27T20:00:00Z"),
        entry("RATE_LIMITED", "2026-09-28T01:58:00Z"),
      ],
      null,
      NOW,
    );
    expect(rows.map((row) => [row.explanation.code, row.ongoing])).toEqual([
      ["RATE_LIMITED", true],
      ["ROUTE_NOT_FOUND", true],
      ["INTERNAL_ERROR", false],
    ]);
    expect(rows[1]?.explanation.what).toMatch(/adresse inexistante/);
  });

  it("sets apart the errors marked as fixed, and brings one back when it happens again", () => {
    const by = "Personne fictive";
    const rows = journalRows(
      [
        {
          ...entry("INTERNAL_ERROR", "2026-09-28T01:55:00Z"),
          resolved: { at: "2026-09-28T01:56:00Z", by },
        },
        {
          ...entry("RATE_LIMITED", "2026-09-28T01:40:00Z"),
          resolved: { at: "2026-09-28T01:30:00Z", by },
        },
        entry("ROUTE_NOT_FOUND", "2026-09-27T20:00:00Z"),
      ],
      null,
      NOW,
    );
    expect(rows.map((row) => [row.explanation.code, row.fixed])).toEqual([
      ["RATE_LIMITED", false],
      ["ROUTE_NOT_FOUND", false],
      ["INTERNAL_ERROR", true],
    ]);
    expect(rows[0]?.resolved?.by).toBe(by);
    // Fixed a few minutes after it last happened: not "en cours" any more.
    expect(rows[2]?.ongoing).toBe(false);
    expect(rows[2]?.group).toEqual({ code: "INTERNAL_ERROR", where: "GET /v1/news" });
  });

  it("adds the collection's failure, and flags a code missing from the catalog", () => {
    const collection: IngestionStatus = {
      checkedAt: "2026-09-28T01:59:00Z",
      lastSuccessAt: "2026-09-28T01:00:00Z",
      lastChangeAt: null,
      lastDetectionSeconds: null,
      consecutiveFailures: 3,
      lastFailure: { code: "INGESTION_SOURCE_UNREACHABLE", at: "2026-09-28T01:59:00Z" },
    };
    const rows = journalRows([entry("SOMETHING_NEW", "2026-09-28T01:00:00Z")], collection, NOW);
    expect(rows[0]).toMatchObject({
      place: COLLECTION_PLACE,
      count: 3,
      ongoing: true,
      group: null,
      fixed: false,
    });
    expect(rows[0]?.explanation.severity).toBe("critical");
    expect(rows[1]?.explanation.catalogued).toBe(false);
  });
});
