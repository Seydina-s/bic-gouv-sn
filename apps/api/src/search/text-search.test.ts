import { describe, expect, it } from "vitest";
import {
  prepareText,
  PreparedTexts,
  scorePrepared,
  searchTerms,
  typosAllowed,
  withinTypos,
} from "./text-search";

const scoreText = (title: string, body: string, terms: string[]) =>
  scorePrepared(prepareText(title, body), terms);

describe("PreparedTexts", () => {
  it("prepares a version once, and again when its content changes", () => {
    const texts = new PreparedTexts();
    let reads = 0;
    const body = () => {
      reads += 1;
      return "<p>Corps</p>";
    };
    texts.get("a:v1", "Titre", body);
    texts.get("a:v1", "Titre", body);
    expect(reads).toBe(1);
    texts.get("a:v2", "Titre", body);
    expect(reads).toBe(2);
  });

  it("empties itself when full, instead of growing without end", () => {
    const texts = new PreparedTexts(2);
    let reads = 0;
    const body = () => {
      reads += 1;
      return "";
    };
    for (const key of ["a", "b", "c", "a"]) {
      texts.get(key, "", body);
    }
    expect(reads).toBe(4);
  });
});

describe("typo tolerance", () => {
  it("allows one typo from 5 letters, two from 9, none in numbers", () => {
    expect(["mali", "senegl", "passeports", "2026"].map(typosAllowed)).toEqual([0, 1, 2, 0]);
  });

  it("counts a letter added, removed, replaced or two neighbours swapped as one", () => {
    expect(withinTypos("senegl", "senegal", 1)).toBe(true);
    expect(withinTypos("pasport", "passport", 1)).toBe(true);
    expect(withinTypos("conseli", "conseil", 1)).toBe(true);
    expect(withinTypos("ministre", "ministere", 1)).toBe(true);
    expect(withinTypos("ministre", "registre", 1)).toBe(false);
    expect(withinTypos("identite", "identitaires", 2)).toBe(false);
  });

  it("finds a text despite a typo, but ranks the exact word higher", () => {
    // Placeholder texts, not real content.
    const exact = scoreText("Le Sénégal", "Texte", searchTerms("senegal"));
    const typed = scoreText("Le Sénégal", "Texte", searchTerms("senegl"));
    expect(typed).toBeGreaterThan(0);
    expect(exact).toBeGreaterThan(typed);
  });

  it("still needs every word, and dates stay exact", () => {
    expect(scoreText("Conseil des ministres", "", searchTerms("conseil budget"))).toBe(0);
    expect(scoreText("Conseil du 3 septembre", "", searchTerms("4 septembre"))).toBe(0);
  });
});
