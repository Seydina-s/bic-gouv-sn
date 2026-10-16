import { describe, expect, it } from "vitest";
import type { PassageIndex } from "./passage-search";
import { needsRephrasing } from "./question-rephrase";

describe("needsRephrasing", () => {
  // Every word known: only the language decides.
  const index = { unknownWords: () => [] } as unknown as PassageIndex;

  it("always rephrases a question outside French into a French search", () => {
    expect(needsRephrasing("Where did the President go?", "en", index)).toBe(true);
    expect(needsRephrasing("Fan la Njiitu Réew mi dem?", "wo", index)).toBe(true);
    // In French, only when a word is found in no passage.
    expect(needsRephrasing("Où est allé le Président ?", "fr", index)).toBe(false);
  });
});
