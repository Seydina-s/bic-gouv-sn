import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ingestLatest } from "./ingest";
import { articleContentHash, mergeArticle } from "./merge";
import type { SourceProvider } from "./sources/source-provider";

const ID = "00000000-0000-5000-8000-000000001074";

// Placeholder texts, not real content.
function version(lang: "fr" | "wo", title: string): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/${lang}/actualites/test/`;
  const translations: NewsArticle["translations"] = [
    { lang, status: "official", title, bodyHtml: "<p>Corps de test</p>", sourceUrl },
  ];
  return {
    id: ID,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2025-10-01",
    sourceUpdatedAt: "2025-10-01T10:00:00Z",
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, "2025-10-01", "communiques"),
    version: 1,
    lang,
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

describe("mergeArticle", () => {
  it("keeps a new article as is", () => {
    expect(mergeArticle(null, version("fr", "Titre"))).toEqual(version("fr", "Titre"));
  });

  it("adds the Wolof version to the French article, French staying the original", () => {
    const merged = mergeArticle(version("fr", "Titre FR"), version("wo", "Tiitar WO"));
    expect(merged.lang).toBe("fr");
    expect(merged.sourceUrl).toBe("https://www.presidence.sn/fr/actualites/test/");
    expect(merged.translations.map((t) => t.lang).sort()).toEqual(["fr", "wo"]);
    expect(merged.contentHash).not.toBe(version("fr", "Titre FR").contentHash);
  });

  it("replaces only the language being re-collected", () => {
    const both = mergeArticle(version("fr", "Titre FR"), version("wo", "Tiitar WO"));
    const edited = mergeArticle(both, version("fr", "Titre FR corrigé"));
    expect(edited.translations.find((t) => t.lang === "fr")?.title).toBe("Titre FR corrigé");
    expect(edited.translations.find((t) => t.lang === "wo")?.title).toBe("Tiitar WO");
  });

  it("keeps Wolof as original when no French version exists", () => {
    const merged = mergeArticle(version("wo", "A"), version("wo", "B"));
    expect(merged.lang).toBe("wo");
  });

  it("gives the same hash whatever the order of languages", () => {
    const frFirst = mergeArticle(version("fr", "F"), version("wo", "W"));
    const woFirst = mergeArticle(version("wo", "W"), version("fr", "F"));
    expect(frFirst.contentHash).toBe(woFirst.contentHash);
  });
});

describe("ingestLatest", () => {
  let dir: string;
  let repo: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-ingest-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function providerReturning(article: NewsArticle): SourceProvider {
    return {
      articleIdFor: () => ID,
      downloadMedia: () => Promise.reject(new Error("no media")),
      listPage: (lang) =>
        Promise.resolve({
          lastPage: 1,
          refs: [{ sourceId: 1074, slug: "test", lang, sourceUpdatedAt: "", coverSourceUrl: null }],
        }),
      fetchArticle: () => Promise.resolve(article),
    };
  }

  it("creates, then leaves identical content untouched, then versions an edit", async () => {
    const first = await ingestLatest(providerReturning(version("fr", "T")), repo, "fr", 8);
    expect(first.outcomes).toEqual({ created: 1, updated: 0, unchanged: 0 });
    const again = await ingestLatest(providerReturning(version("fr", "T")), repo, "fr", 8);
    expect(again.outcomes).toEqual({ created: 0, updated: 0, unchanged: 1 });
    const wolof = await ingestLatest(providerReturning(version("wo", "W")), repo, "wo", 8);
    expect(wolof.outcomes).toEqual({ created: 0, updated: 1, unchanged: 0 });
    const stored = await repo.get(ID);
    expect(stored?.version).toBe(2);
    expect(stored?.translations).toHaveLength(2);
    expect(await repo.history(ID)).toHaveLength(1);
  });
});
