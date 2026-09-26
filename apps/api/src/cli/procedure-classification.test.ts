import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The 15 official themes of e-senegal.sn (ids at the source, docs/sources.md).
const OFFICIAL = [
  "688d064649b595b42707a1f4",
  "688d064649b595b42707a203",
  "688d064649b595b42707a1f8",
  "688d064649b595b42707a1fd",
  "688d064649b595b42707a201",
  "688d064649b595b42707a202",
  "688d064649b595b42707a200",
  "688d064649b595b42707a1f6",
  "688d064649b595b42707a204",
  "688d064649b595b42707a1ff",
  "688d064649b595b42707a1fe",
  "688d064649b595b42707a1fb",
  "688d064649b595b42707a1fa",
  "688d064649b595b42707a1f9",
  "688d064649b595b42707a1f5",
];

interface Classification {
  platformThemes: { id: string; title: string }[];
  assignments: Record<string, string>;
}

const data = JSON.parse(
  readFileSync(new URL("../../data/procedure-classification.json", import.meta.url), "utf8"),
) as Classification;

describe("reviewed classification of procedures", () => {
  it("only uses official themes or the themes it declares", () => {
    const known = new Set([...OFFICIAL, ...data.platformThemes.map((theme) => theme.id)]);
    const unknown = Object.values(data.assignments).filter((themeId) => !known.has(themeId));
    expect(unknown).toEqual([]);
  });

  it("never declares a theme that duplicates an official one, and uses each one it adds", () => {
    const used = new Set(Object.values(data.assignments));
    for (const theme of data.platformThemes) {
      expect(OFFICIAL).not.toContain(theme.id);
      expect(used.has(theme.id)).toBe(true);
    }
  });

  it("files every procedure once, by its slug", () => {
    const slugs = Object.keys(data.assignments);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug))).toBe(true);
  });
});
