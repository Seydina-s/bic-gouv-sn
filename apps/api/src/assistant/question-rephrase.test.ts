import { describe, expect, it } from "vitest";
import { REPHRASE_RULES } from "./question-rephrase";
import { questionIntent } from "./retrieval";

describe("the rephrasing rules", () => {
  it("ask for abbreviations written in full and the words of time kept (17/10/2026)", () => {
    // "dernier cm" and "kom on fait pr avoir un pasport" found their page 7 times in 10.
    expect(REPHRASE_RULES).toContain('"cm" → "Conseil des ministres"');
    expect(REPHRASE_RULES).toContain("Keep the words of time");
    expect(REPHRASE_RULES).toContain("Never answer the message");
  });

  it("name a procedure as the sheets do, which brings the sheets first (25/10/2026)", () => {
    // "J'ai perdu ma pièce d'identité", "une aide pour payer l'université": the sheets
    // on the national identity card and on the grants were never given.
    expect(REPHRASE_RULES).toContain('begin the query with "démarche"');
    expect(questionIntent("démarche demander une bourse d'études").procedure).toBe(true);
  });
});
