import type { NewsArticle, StateService } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { procedure } from "../testing/procedure-fixture";
import { articlePassages, paragraphsOf, procedurePassages, servicePassages } from "./passages";

// Placeholder texts, not real content.
function article(translations: NewsArticle["translations"]): NewsArticle {
  return {
    id: "00000000-0000-5000-8000-000000000001",
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl: "https://www.presidence.sn/fr/actualites/test-1/",
    sourcePublishedOn: "2026-09-21",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: "1".repeat(64),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

const fr = (bodyHtml: string) => ({
  lang: "fr" as const,
  status: "official" as const,
  title: "Titre de test",
  bodyHtml,
  sourceUrl: "https://www.presidence.sn/fr/actualites/test-1/",
});

const wo = (overrides: Partial<NewsArticle["translations"][number]> = {}) => ({
  lang: "wo" as const,
  status: "official" as const,
  title: "[wo] Titre de test",
  bodyHtml: "<p>[wo] Mbind mi</p>",
  sourceUrl: "https://www.presidence.sn/wo/actualites/test-1/",
  ...overrides,
});

const sentence = (n: number) => `Phrase de test numéro ${String(n)} avec quelques mots de plus.`;

describe("paragraphsOf", () => {
  it("reads paragraphs, headings and lists, and leaves images out", () => {
    const html =
      '<h2>Intertitre</h2><p>Un <strong>texte</strong>  de test.</p><img src="https://www.presidence.sn/a.jpg"><ul><li>Un</li><li>Deux</li></ul>';
    expect(paragraphsOf(html)).toEqual(["Intertitre", "Un texte de test.", "- Un\n- Deux"]);
  });
});

describe("articlePassages", () => {
  it("keeps the source, the date, the version and the section on every passage", () => {
    const [passage] = articlePassages(article([fr("<p>Corps de test.</p>")]));
    expect(passage).toEqual({
      id: "00000000-0000-5000-8000-000000000001:fr:0",
      contentId: "00000000-0000-5000-8000-000000000001",
      kind: "news-article",
      lang: "fr",
      status: "official",
      title: "Titre de test",
      sourceUrl: "https://www.presidence.sn/fr/actualites/test-1/",
      publishedOn: "2026-09-21",
      contentHash: "1".repeat(64),
      section: "communiques",
      publisher: "Présidence",
      text: "Corps de test.",
    });
  });

  it("cuts each language version on its own, with its own link", () => {
    const passages = articlePassages(article([fr("<p>Corps de test.</p>"), wo()]));
    expect(passages.map((passage) => [passage.id.slice(-4), passage.sourceUrl])).toEqual([
      ["fr:0", "https://www.presidence.sn/fr/actualites/test-1/"],
      ["wo:0", "https://www.presidence.sn/wo/actualites/test-1/"],
    ]);
  });

  it("never quotes a machine translation or a withdrawn version", () => {
    const passages = articlePassages(
      article([fr("<p>Corps de test.</p>"), wo({ status: "machine", sourceUrl: undefined })]),
    );
    expect(passages.map((passage) => passage.lang)).toEqual(["fr"]);
    const withdrawn = articlePassages(
      article([{ ...fr("<p>Corps.</p>"), withdrawnAt: "2026-09-30T10:00:00Z" }]),
    );
    expect(withdrawn).toEqual([]);
  });

  it("links a reviewed translation to the original page", () => {
    const reviewed = wo({
      status: "reviewed",
      sourceUrl: undefined,
      review: { reviewerId: "relecteur", reviewedAt: "2026-09-26T10:00:00Z" },
    });
    const passages = articlePassages(article([fr("<p>Corps.</p>"), reviewed]));
    expect(passages[1]).toMatchObject({
      status: "reviewed",
      sourceUrl: "https://www.presidence.sn/fr/actualites/test-1/",
    });
  });

  it("groups short paragraphs and splits long ones, in order, within the ceiling", () => {
    const short = Array.from({ length: 40 }, (_, n) => `<p>${sentence(n)}</p>`).join("");
    const long = `<p>${Array.from({ length: 60 }, (_, n) => sentence(100 + n)).join(" ")}</p>`;
    const passages = articlePassages(article([fr(short + long)]));
    expect(passages.length).toBeGreaterThan(3);
    for (const passage of passages) {
      expect(passage.text.length).toBeLessThanOrEqual(1400);
    }
    const words = passages.flatMap((passage) => passage.text.split(/\s+/u));
    expect(words.join(" ")).toBe(
      [
        ...Array.from({ length: 40 }, (_, n) => sentence(n)),
        ...Array.from({ length: 60 }, (_, n) => sentence(100 + n)),
      ].join(" "),
    );
  });

  it("cuts a sentence without punctuation between words", () => {
    const endless = `<p>${Array.from({ length: 400 }, () => "mot").join(" ")}</p>`;
    const passages = articlePassages(article([fr(endless)]));
    expect(passages.length).toBe(2);
    expect(passages.every((passage) => passage.text.length <= 1400)).toBe(true);
  });
});

describe("procedurePassages", () => {
  it("adds the sheet's facts and questions as the sheet labels them", () => {
    const sheet = procedure(1, "Démarche de test", "<p>Étapes de test.</p>", {
      summary: "Résumé de test.",
      eligibility: "Toute personne de test.",
      documents: ["Pièce A", "Pièce B"],
      costFcfa: 2000,
      delayDays: 1,
      online: true,
      offices: [
        {
          name: "Bureau de test",
          acronym: null,
          address: "Rue de test",
          town: "Ville de test",
          region: null,
          phone: null,
          email: null,
        },
      ],
      faqs: [{ question: "Question de test ?", answerHtml: "<p>Réponse de test.</p>" }],
    });
    const [passage] = procedurePassages(sheet);
    expect(passage?.text).toBe(
      [
        "Étapes de test.",
        "Résumé de test.",
        "Qui peut faire la démarche ?\nToute personne de test.",
        "Pièces à fournir\n- Pièce A\n- Pièce B",
        "Coût : 2000 F CFA",
        "Délai : 1 jour",
        "Possible en ligne",
        "Où s'adresser\n- Bureau de test, Rue de test, Ville de test",
        "Question de test ?\nRéponse de test.",
      ].join("\n\n"),
    );
    expect(passage).toMatchObject({ kind: "procedure", sourceUrl: sheet.sourceUrl });
  });

  it("says free only when the source says 0, and nothing when it gives no fee", () => {
    const free = procedurePassages(procedure(2, "Gratuite", "<p>Corps.</p>", { costFcfa: 0 }));
    expect(free[0]?.text).toContain("Coût : Gratuit");
    const unknown = procedurePassages(procedure(3, "Inconnue", "<p>Corps.</p>"));
    expect(unknown[0]?.text).toBe("Corps.");
  });
});

describe("servicePassages", () => {
  // A placeholder office, not a real one.
  const office: StateService = {
    id: "osm-n42",
    category: "mairie",
    name: "Mairie fictive de Test",
    address: "Avenue fictive",
    town: "Dakar",
    location: { lat: 14.7, lng: -17.4 },
    phone: "+221 33 000 00 00",
    website: null,
    openingHours: "Mo-Fr 08:00-17:00",
    origin: { kind: "osm", osmType: "node", osmId: 42, fetchedAt: "2026-09-27T10:00:00Z" },
    status: "verified",
    reviewedBy: "Équipe",
    reviewedAt: "2026-10-15T09:00:00Z",
    pendingUpdate: null,
    corrections: { name: "Mairie corrigée de Test" },
  };

  it("gives one passage per verified office, traceable to its map object and its check", () => {
    const [passage] = servicePassages(office);
    expect(passage).toMatchObject({
      contentId: "osm-n42",
      kind: "service",
      lang: "fr",
      title: "Mairie corrigée de Test",
      sourceUrl: "https://www.openstreetmap.org/node/42",
      publishedOn: "2026-10-15",
      publisher: "Services de l'État vérifiés (carte de l'application)",
    });
    expect(passage?.text).toContain("Mairie corrigée de Test (Mairie)");
    expect(passage?.text).toContain("Avenue fictive, Dakar");
    expect(passage?.text).toContain("Mo-Fr 08:00-17:00");
    expect(passage?.text).toContain("+221 33 000 00 00");
    // Its place on the map, even with no address (most offices).
    expect(passage?.text).toContain(
      "Emplacement : sur la carte de l'application (14.7000, -17.4000)",
    );
    const [noAddress] = servicePassages({ ...office, address: null, town: null });
    expect(noAddress?.text).toContain("Emplacement : sur la carte de l'application");
  });

  it("leaves out an office not verified, or typed in the console with no public page", () => {
    expect(servicePassages({ ...office, status: "proposed" })).toEqual([]);
    expect(
      servicePassages({
        ...office,
        id: "manual-test-1",
        origin: { kind: "manual", createdBy: "Équipe", createdAt: "2026-10-01T10:00:00Z" },
      }),
    ).toEqual([]);
  });
});
