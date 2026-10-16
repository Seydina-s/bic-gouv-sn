import { describe, expect, it } from "vitest";
import { pluralCategory, selectPluralForm } from "./plural";

describe("pluralCategory", () => {
  it.each([
    [0, "one"],
    [1, "one"],
    [1.5, "one"],
    [2, "other"],
    [-1, "one"],
    [1_000_000, "many"],
    [2_000_000, "many"],
    [1_000_001, "other"],
  ] as const)("fr %s → %s", (count, expected) => {
    expect(pluralCategory("fr", count)).toBe(expected);
  });

  it("always returns other in Wolof", () => {
    expect([0, 1, 2, 1_000_000].map((n) => pluralCategory("wo", n))).toEqual([
      "other",
      "other",
      "other",
      "other",
    ]);
  });

  it("uses one for exactly 1 in English, 0 being plural", () => {
    expect([0, 1, -1, 1.5, 2, 1_000_000].map((n) => pluralCategory("en", n))).toEqual([
      "other",
      "one",
      "one",
      "other",
      "other",
      "other",
    ]);
  });
});

describe("selectPluralForm", () => {
  it("falls back to other when a form is absent", () => {
    expect(selectPluralForm({ other: "x" }, "fr", 1)).toBe("x");
    expect(selectPluralForm({ other: "x" }, "fr", 1_000_000)).toBe("x");
  });

  it("uses the many form for exact millions", () => {
    expect(selectPluralForm({ many: "m", other: "o" }, "fr", 3_000_000)).toBe("m");
  });
});
