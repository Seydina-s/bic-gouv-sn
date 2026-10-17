import { describe, expect, it } from "vitest";
import { REPHRASE_RULES } from "./question-rephrase";

describe("the rephrasing rules", () => {
  it("ask for abbreviations written in full and the words of time kept (17/10/2026)", () => {
    // "dernier cm" and "kom on fait pr avoir un pasport" found their page 7 times in 10.
    expect(REPHRASE_RULES).toContain('"cm" → "Conseil des ministres"');
    expect(REPHRASE_RULES).toContain("Keep the words of time");
    expect(REPHRASE_RULES).toContain("Never answer the message");
  });
});
