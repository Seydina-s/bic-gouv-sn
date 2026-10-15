import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileDocument } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { temporaryStore } from "../testing/store";
import {
  AutomaticOpportunities,
  deadlineIn,
  opportunityFromArticle,
  opportunityKindOf,
} from "./automatic-opportunities";
import { AUTOMATIC_COLLECTOR, FileOpportunityStore, OpportunityService } from "./opportunities";

const NOW = new Date("2026-10-15T09:00:00Z");

// Placeholder content shaped like a ministry's article, never a real call.
function article(
  n: number,
  title: string,
  body: string,
  overrides: Partial<NewsArticle> = {},
): NewsArticle {
  const sourceUrl = `https://www.mesrisenegal.sn/2026/10/annonce-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    publisher: "enseignement-superieur",
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: "2026-10-10",
    sourceUpdatedAt: null,
    fetchedAt: "2026-10-10T10:00:00Z",
    contentHash: String(n).padStart(64, "0"),
    version: 1,
    lang: "fr",
    translations: [{ lang: "fr", status: "official", title, bodyHtml: body, sourceUrl }],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
    ...overrides,
  };
}

describe("what a title announces", () => {
  it.each([
    ["Appel à candidatures – Programme fictif de formation", "formation"],
    ["Appel à manifestation d’intérêt pour un programme fictif", "candidature"],
    ["Admission fictive : Appel à candidatures pour les bacheliers", "candidature"],
    ["Un laboratoire fictif recrute un(e) ingénieur(e)", "emploi"],
    ["Appel à projets fictif pour les jeunes entrepreneurs", "financement"],
    ["Avis d’appel d’offres fictif n° 12", "appel-offres"],
    ["Ouverture des concours fictifs de la session 2026", "concours"],
    ["Campagne de dépôt des demandes de bourses fictives", "bourse"],
    // The decorative letters some sites use in their titles.
    ["𝐀𝐩𝐩𝐞𝐥 𝐚̀ 𝐜𝐚𝐧𝐝𝐢𝐝𝐚𝐭𝐮𝐫𝐞𝐬 programme fictif", "candidature"],
  ])("finds the opportunity in « %s »", (title, kind) => {
    expect(opportunityKindOf(title)).toBe(kind);
  });

  it.each([
    "Le ministre reçoit une délégation fictive",
    "Retour sur l’atelier fictif consacré aux appels de fonds",
    "Cérémonie fictive de remise des prix du concours général",
  ])("finds none in « %s »", (title) => {
    expect(opportunityKindOf(title)).toBeNull();
  });
});

describe("the closing date written in an official text", () => {
  it.each([
    ["La date limite de dépôt des dossiers est fixée au 30 octobre 2026.", "2026-10-30"],
    ["Les candidatures sont reçues au plus tard le 1er décembre 2026 à 17 h.", "2026-12-01"],
    ["Dossiers à déposer avant le 5 février 2027.", "2027-02-05"],
  ])("reads it in « %s »", (text, iso) => {
    expect(deadlineIn(text)).toBe(iso);
  });

  it.each([
    "Le ministre s'est rendu à Thiès le 12 octobre 2026.",
    "Date limite : 31 février 2027.",
    "Date limite : prochainement.",
  ])("never guesses one in « %s »", (text) => {
    expect(deadlineIn(text)).toBeNull();
  });
});

describe("an opportunity from an official article", () => {
  it("takes its title, first words, institution and link, and its closing date", () => {
    const draft = opportunityFromArticle(
      article(
        1,
        "Appel à candidatures pour un programme fictif",
        "<p>Texte fictif de l'appel. La date limite est fixée au 30 octobre 2026.</p>",
      ),
      NOW,
    );
    expect(draft).toEqual({
      kind: "candidature",
      title: "Appel à candidatures pour un programme fictif",
      organization: "Ministère de l'Enseignement supérieur, de la Recherche et de l'Innovation",
      summary: "Texte fictif de l'appel. La date limite est fixée au 30 octobre 2026.",
      deadline: "2026-10-30",
      officialUrl: "https://www.mesrisenegal.sn/2026/10/annonce-1/",
    });
  });

  it("leaves out a closed call, an old undated one, and plain news", () => {
    const closed = article(
      2,
      "Appel à candidatures fictif",
      "<p>Date limite : 1er octobre 2026.</p>",
    );
    const oldUndated = article(3, "Appel à candidatures fictif", "<p>Texte fictif.</p>", {
      sourcePublishedOn: "2026-08-01",
    });
    const news = article(4, "Le ministre reçoit une délégation fictive", "<p>Texte.</p>");
    for (const item of [closed, oldUndated, news]) {
      expect(opportunityFromArticle(item, NOW)).toBeNull();
    }
  });
});

describe("opportunities fed from the official sites", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-automatic-opportunities-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("publishes each call once, never again once the team withdrew it", async () => {
    const articles = temporaryStore();
    await articles.save(article(5, "Appel à candidatures fictif", "<p>Texte fictif.</p>"));
    let now = NOW;
    const opportunities = new OpportunityService(
      new FileOpportunityStore(join(dir, "opportunities.json")),
      null,
      () => now,
    );
    const collector = new AutomaticOpportunities({ articles, opportunities, now: () => now });
    expect(await collector.tick()).toBe(1);
    expect(await collector.tick()).toBe(0);
    const [collected] = await opportunities.list();
    expect(collected).toMatchObject({ status: "published", preparedBy: AUTOMATIC_COLLECTOR });
    expect(await opportunities.published()).toHaveLength(1);
    await opportunities.withdraw({ id: "a", name: "Personne A" }, collected?.id ?? "");
    expect(await collector.tick()).toBe(0);
    expect(await opportunities.published()).toHaveLength(0);
    // An undated call collected long ago is no longer shown.
    await articles.save(article(6, "Appel à projets fictif", "<p>Texte fictif.</p>"));
    expect(await collector.tick()).toBe(1);
    now = new Date("2026-12-15T09:00:00Z");
    expect(await opportunities.published()).toHaveLength(0);
  });

  it("also reads the DER/FJ's calls in the news of the Entreprendre space", async () => {
    const opportunities = new OpportunityService(
      new FileOpportunityStore(join(dir, "opportunities.json")),
      null,
      () => NOW,
    );
    const entreprendre = fileDocument(join(dir, "entreprendre.json"));
    await entreprendre.update(() => ({
      next: {
        pages: [],
        news: [
          {
            title: "Appel à manifestation d'intérêt fictif",
            publishedOn: "2026-10-10",
            sourceUrl: "https://www.der.sn/ami-fictif/",
            excerpt: "Premiers mots fictifs de l'appel, date limite le 30 novembre 2026.",
          },
          {
            title: "Une visite fictive de la DER/FJ",
            publishedOn: "2026-10-11",
            sourceUrl: "https://www.der.sn/visite-fictive/",
            excerpt: "Texte fictif.",
          },
        ],
        newsFetchedAt: "2026-10-15T08:00:00.000Z",
      },
      result: null,
    }));
    const collector = new AutomaticOpportunities({
      articles: temporaryStore(),
      opportunities,
      entreprendre,
      now: () => NOW,
    });
    expect(await collector.tick()).toBe(1);
    expect((await opportunities.published())[0]).toMatchObject({
      kind: "candidature",
      organization:
        "Délégation générale à l'Entrepreneuriat rapide des Femmes et des Jeunes (DER/FJ)",
      deadline: "2026-11-30",
      officialUrl: "https://www.der.sn/ami-fictif/",
    });
  });
});
