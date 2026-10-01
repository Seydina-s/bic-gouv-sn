import { describe, expect, it } from "vitest";
import {
  errorJournalFileSchema,
  isOngoing,
  isResolved,
  ONGOING_WINDOW_MS,
  resolveErrorSchema,
} from "./error-journal.schema";

const AT = "2026-10-01T09:00:00.000Z";
const entry = {
  code: "INTERNAL_ERROR",
  where: "GET /v1/news",
  count: 1,
  firstAt: AT,
  lastAt: AT,
  lastRequestId: null,
};

describe("error journal entries", () => {
  it("read the journals saved before a group could be marked as fixed", () => {
    expect(errorJournalFileSchema.parse({ schemaVersion: 1, entries: [entry] }).entries).toEqual([
      entry,
    ]);
  });

  it("are still happening within the window, not after", () => {
    const at = Date.parse(AT);
    expect(isOngoing(entry, new Date(at + ONGOING_WINDOW_MS))).toBe(true);
    expect(isOngoing(entry, new Date(at + ONGOING_WINDOW_MS + 1))).toBe(false);
  });

  it("are fixed when marked so and not seen since; seen after, they are back", () => {
    const by = "Personne fictive";
    expect(isResolved(entry)).toBe(false);
    expect(isResolved({ ...entry, resolved: { at: AT, by } })).toBe(true);
    expect(isResolved({ ...entry, resolved: { at: "2026-10-01T08:59:59.000Z", by } })).toBe(false);
  });

  it("are marked as fixed by their code and place only", () => {
    expect(resolveErrorSchema.parse({ code: entry.code, where: entry.where })).toEqual({
      code: entry.code,
      where: entry.where,
    });
    expect(resolveErrorSchema.safeParse({ code: "", where: entry.where }).success).toBe(false);
  });
});
