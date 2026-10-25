import { describe, expect, it } from "vitest";
import { datesOf } from "./grounded-answer";
import { PassageIndex, withinEdits } from "./passage-search";
import type { Passage } from "./passages";
import { widenQuestion } from "./question-words";

describe("widenQuestion", () => {
  it("adds the full words of text shortcuts and acronyms, keeping the question as typed", () => {
    expect(widenQuestion("c ki le pdt")).toBe("c ki le pdt qui président");
    expect(widenQuestion("le DG du BIC Gouv")).toBe(
      "le DG du BIC Gouv directeur général Bureau de l'Information et de la Communication du Gouvernement gouvernement",
    );
    expect(widenQuestion("Comment obtenir un passeport ?")).toBe("Comment obtenir un passeport ?");
  });

  it("adds the official words of everyday ones (bench of 17/10/2026)", () => {
    expect(widenQuestion("Comment protéger le design de mon produit ?")).toBe(
      "Comment protéger le design de mon produit ? dessin modèle industriel",
    );
    expect(widenQuestion("Comment devenir soldat ?")).toBe(
      "Comment devenir soldat ? carrière militaire armée",
    );
    expect(widenQuestion("Je refuse l'héritage")).toBe("Je refuse l'héritage succession");
  });
});

describe("typing slips", () => {
  it("counts the letters to change", () => {
    expect(withinEdits("presidant", "president", 1)).toBe(true);
    expect(withinEdits("pasport", "passport", 1)).toBe(true);
    expect(withinEdits("ministre", "minister", 1)).toBe(false);
    expect(withinEdits("ministre", "minister", 2)).toBe(true);
  });

  it("finds a passage despite a slip in a long word, never in a short one", () => {
    // Placeholder text, not real content.
    const passage: Passage = {
      id: "c:fr:0",
      contentId: "c",
      kind: "procedure",
      lang: "fr",
      status: "official",
      title: "Demander un passeport fictif",
      sourceUrl: "https://e-senegal.sn/#/fictif",
      publishedOn: null,
      contentHash: "1".repeat(64),
      text: "Pièces fictives à fournir pour le passeport.",
    };
    const index = new PassageIndex([passage]);
    expect(index.search("passeport", { lang: "fr", limit: 5 })).toHaveLength(1);
    expect(index.search("piece", { lang: "fr", limit: 5 })).toHaveLength(1);
    expect(index.search("pass", { lang: "fr", limit: 5 })).toHaveLength(0);
  });
});

describe("datesOf", () => {
  it("gives the model today, and the bounds of this week to a question about it", () => {
    expect(datesOf("2026-10-11", true)).toBe(
      "Today's date: 2026-10-11 (Sunday). This week: Monday 2026-10-05 to Sunday 2026-10-11.",
    );
    expect(datesOf("2026-10-12", true)).toContain("Monday 2026-10-12 to Sunday 2026-10-18");
    // Bench of 25/10/2026: given to all, the week made "the last Council" a refusal.
    expect(datesOf("2026-10-25", false)).toBe("Today's date: 2026-10-25 (Sunday).");
  });
});
