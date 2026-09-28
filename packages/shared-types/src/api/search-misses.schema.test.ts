import { describe, expect, it } from "vitest";
import { normalizeSearchQuery, shownSearchMisses, type SearchMiss } from "./search-misses.schema";

const miss = (query: string, count: number, lastOn = "2026-09-28"): SearchMiss => ({
  area: "news",
  lang: "fr",
  query,
  count,
  lastOn,
});

describe("search misses", () => {
  it("writes a search one way, so its variants add up", () => {
    expect(normalizeSearchQuery("  Carte   d'Identité ")).toBe("carte d'identité");
    expect(normalizeSearchQuery("a".repeat(200))).toHaveLength(120);
  });

  it("shows only searches made at least 3 times, most searched first", () => {
    const shown = shownSearchMisses([miss("rare", 2), miss("bourse", 3), miss("passeport", 9)]);
    expect(shown.map((entry) => entry.query)).toEqual(["passeport", "bourse"]);
  });
});
