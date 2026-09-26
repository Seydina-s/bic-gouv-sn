import type { NewsArticle } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { temporaryStore } from "../testing/store";
import { normalizeForSearch, searchTerms } from "../search/text-search";
import { searchArticles } from "./search";

// Placeholder texts, not real content.
function article(n: number, title: string, body: string, lang: "fr" | "wo" = "fr"): NewsArticle {
  const url = `https://www.presidence.sn/${lang}/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    category: "communiques",
    sourceUrl: url,
    sourcePublishedOn: `2026-09-${String(10 + n)}`,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang,
    translations: [{ lang, status: "official", title, bodyHtml: body, sourceUrl: url }],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

describe("normalizeForSearch", () => {
  it("ignores case, accents, Wolof letters and markup", () => {
    expect(normalizeForSearch("<p>Sénégal : ÉCOLE, Ñaari ŋ</p>")).toBe("senegal ecole naari n");
  });

  it("keeps meaningful terms only", () => {
    expect(searchTerms("  le  Conseil, des  ministres ")).toEqual([
      "le",
      "conseil",
      "des",
      "ministres",
    ]);
    expect(searchTerms("a !")).toEqual([]);
    expect(searchTerms("le 3 septembre")).toEqual(["le", "3", "septembre"]);
  });
});

describe("searchArticles", () => {
  async function store() {
    const articles = temporaryStore();
    await articles.save(article(1, "Visite à Kaolack", "<p>Le Président à Kaolack.</p>"));
    await articles.save(article(2, "Conseil des ministres", "<p>Kaolack et Thiès cités.</p>"));
    await articles.save(article(3, "Audience", "<p>Rien à voir.</p>"));
    return articles;
  }

  it("finds every article holding all the words, title matches first", async () => {
    const hits = await searchArticles(await store(), { query: "KAOLACK", lang: "fr", limit: 10 });
    expect(hits.map((hit) => hit.translations[0]?.title)).toEqual([
      "Visite à Kaolack",
      "Conseil des ministres",
    ]);
    const both = await searchArticles(await store(), {
      query: "kaolack thies",
      lang: "fr",
      limit: 10,
    });
    expect(both.map((hit) => hit.translations[0]?.title)).toEqual(["Conseil des ministres"]);
  });

  it("searches only the requested language and respects the limit", async () => {
    const articles = await store();
    expect(await searchArticles(articles, { query: "kaolack", lang: "wo", limit: 10 })).toEqual([]);
    expect(await searchArticles(articles, { query: "kaolack", lang: "fr", limit: 1 })).toHaveLength(
      1,
    );
    expect(await searchArticles(articles, { query: "?", lang: "fr", limit: 10 })).toEqual([]);
  });
});
