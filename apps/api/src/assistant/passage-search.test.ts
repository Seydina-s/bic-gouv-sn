import { describe, expect, it } from "vitest";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";

// Placeholder texts, not real content.
function passage(n: number, title: string, text: string, lang: "fr" | "wo" = "fr"): Passage {
  return {
    id: `content-${String(n)}:${lang}:0`,
    contentId: `content-${String(n)}`,
    kind: "news-article",
    lang,
    status: "official",
    title,
    sourceUrl: `https://www.presidence.sn/${lang}/actualites/test-${String(n)}/`,
    publishedOn: "2026-09-21",
    contentHash: "1".repeat(64),
    text,
  };
}

const index = new PassageIndex([
  passage(1, "Conseil de test", "Le conseil a examiné le projet de route de test."),
  passage(2, "Visite de test", "Le président a visité le marché de test et le port de test."),
  passage(
    3,
    "Communiqué de test",
    "Le port de test ouvre un nouveau quai de test. Le port grandit.",
  ),
  passage(4, "[wo] Ndaje", "[wo] Port bi", "wo"),
]);

const ids = (query: string, lang: "fr" | "wo" = "fr") =>
  index.search(query, { lang, limit: 5 }).map((found) => found.passage.contentId);

describe("PassageIndex", () => {
  it("ranks the passages where the rare words of the question appear most", () => {
    expect(ids("Que se passe-t-il au port ?")).toEqual(["content-3", "content-2"]);
  });

  it("ignores case and accents, and counts title words more", () => {
    expect(ids("CONSEIL")).toEqual(["content-1"]);
    expect(ids("visite marche")).toEqual(["content-2"]);
  });

  it("searches only the language asked, and finds nothing without a matching word", () => {
    expect(ids("port", "wo")).toEqual(["content-4"]);
    expect(ids("aéroport")).toEqual([]);
    expect(index.search("port", { lang: "fr", limit: 1 })).toHaveLength(1);
    expect(new PassageIndex([]).search("port", { lang: "fr", limit: 5 })).toEqual([]);
  });

  it("leaves French question words out, since they say nothing of the subject", () => {
    const asked = new PassageIndex([
      passage(5, "Comment faire une démarche de test", "Comment faire, comment savoir."),
      passage(6, "Démarche du port", "Le port de test."),
      passage(7, "Autre", "Un texte sans rapport."),
    ]);
    const found = asked.search("Comment aller au port ?", { lang: "fr", limit: 5 });
    expect(found.map((result) => result.passage.contentId)).toEqual(["content-6"]);
  });

  it("finds a French word under another form of it, but keeps Wolof words whole", () => {
    const forms = new PassageIndex([
      passage(8, "Procédure de divorce", "Les pièces à fournir."),
      passage(9, "[wo] Jëf", "[wo] Jëfandikoo", "wo"),
    ]);
    const first = (query: string, lang: "fr" | "wo" = "fr") =>
      forms.search(query, { lang, limit: 1 })[0]?.passage.contentId;
    expect(first("Je veux divorcer")).toBe("content-8");
    expect(first("une pièce")).toBe("content-8");
    expect(first("jëf", "wo")).toBe("content-9");
    expect(first("jëfandikoo", "wo")).toBe("content-9");
    expect(forms.search("jëfa", { lang: "wo", limit: 1 })).toEqual([]);
  });

  it("replaces the passages of one content, in every language, without rebuilding", () => {
    const live = new PassageIndex([
      passage(1, "Conseil de test", "Le conseil a examiné le projet de route."),
      passage(2, "Visite de test", "Le président a visité le port."),
      passage(2, "[wo] Visite", "[wo] Port bi", "wo"),
    ]);
    live.replaceContent("content-2", [passage(2, "Visite corrigée", "Le marché.")]);
    const fresh = new PassageIndex([
      passage(1, "Conseil de test", "Le conseil a examiné le projet de route."),
      passage(2, "Visite corrigée", "Le marché."),
    ]);
    expect(live.search("port", { lang: "fr", limit: 5 })).toEqual([]);
    expect(live.search("port", { lang: "wo", limit: 5 })).toEqual([]);
    for (const query of ["marché", "conseil route", "le visite"]) {
      expect(live.search(query, { lang: "fr", limit: 5 })).toEqual(
        fresh.search(query, { lang: "fr", limit: 5 }),
      );
    }
  });

  it("removes a withdrawn content, and indexes a new language on its first passage", () => {
    const live = new PassageIndex([passage(1, "Conseil de test", "Le port.")]);
    live.replaceContent("content-1", []);
    expect(live.search("port", { lang: "fr", limit: 5 })).toEqual([]);
    live.replaceContent("content-3", [passage(3, "[wo] Ndaje", "[wo] Port bi", "wo")]);
    expect(live.search("port", { lang: "wo", limit: 5 }).map((f) => f.passage.contentId)).toEqual([
      "content-3",
    ]);
  });

  it("gives words found everywhere almost no weight", () => {
    const [first] = index.search("le port", { lang: "fr", limit: 5 });
    const [alone] = index.search("port", { lang: "fr", limit: 5 });
    expect(first?.passage.contentId).toBe("content-3");
    expect(first?.score).toBeCloseTo(alone?.score ?? 0, 0);
  });
});
