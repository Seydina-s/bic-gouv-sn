import { describe, expect, it } from "vitest";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";
import { PASSAGES_GIVEN, questionIntent, retrievePassages } from "./retrieval";

// Placeholder texts, not real content.
function passage(n: number, publishedOn: string, section: string, text: string, part = 0): Passage {
  return {
    id: `content-${String(n)}:fr:${String(part)}`,
    contentId: `content-${String(n)}`,
    kind: "news-article",
    lang: "fr",
    status: "official",
    title: `Titre fictif ${String(n)}`,
    sourceUrl: `https://www.presidence.sn/fr/actualites/test-${String(n)}/`,
    publishedOn,
    contentHash: "1".repeat(64),
    section,
    text,
  };
}

const TODAY = "2026-10-08";

const index = new PassageIndex([
  passage(1, "2024-05-02", "international", "Le Président en visite officielle fictive à Paris."),
  passage(2, "2026-10-06", "communiques", "Le Président reçoit une délégation fictive."),
  passage(3, "2026-10-07", "international", "Visite officielle fictive du Président en Égypte."),
  passage(4, "2026-09-30", "conseil-des-ministres", "Le Conseil a examiné un projet fictif.", 0),
  passage(4, "2026-09-30", "conseil-des-ministres", "Mesures individuelles fictives.", 1),
  passage(5, "2026-09-10", "conseil-des-ministres", "Un ancien conseil fictif."),
]);

describe("the question's intent", () => {
  it("hears a question about recent news, and a section it names", () => {
    expect(questionIntent("Où est allé le président cette semaine ?")).toEqual({
      recent: true,
      section: null,
    });
    expect(questionIntent("Qu'a dit le dernier Conseil des ministres ?")).toEqual({
      recent: true,
      section: "conseil-des-ministres",
    });
    expect(questionIntent("Comment obtenir un passeport ?")).toEqual({
      recent: false,
      section: null,
    });
  });
});

describe("the extracts given to the model", () => {
  it("bring the newest article of the section named, from its opening", () => {
    const given = retrievePassages(
      index,
      "Qu'a dit le dernier Conseil des ministres ?",
      "fr",
      TODAY,
    );
    expect(given.slice(0, 2).map((p) => p.id)).toEqual(["content-4:fr:0", "content-4:fr:1"]);
  });

  it("bring this week's news first for a question about recent news", () => {
    const given = retrievePassages(index, "Où est allé le président cette semaine ?", "fr", TODAY);
    expect(given[0]?.contentId).toBe("content-3");
    expect(given.findIndex((p) => p.contentId === "content-1")).toBeGreaterThan(
      given.findIndex((p) => p.contentId === "content-2"),
    );
    expect(given.length).toBeLessThanOrEqual(PASSAGES_GIVEN);
    expect(new Set(given.map((p) => p.id)).size).toBe(given.length);
  });

  it("still follow the words for any other question, newer first only when equal", () => {
    const given = retrievePassages(index, "visite officielle Paris", "fr", TODAY);
    expect(given[0]?.contentId).toBe("content-1");
    expect(retrievePassages(index, "aéroport lointain", "fr", TODAY)).toEqual([]);
  });
});
