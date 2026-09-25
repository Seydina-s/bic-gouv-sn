import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backfill } from "./backfill";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";

function idOf(sourceId: number): string {
  return `00000000-0000-5000-8000-${String(sourceId).padStart(12, "0")}`;
}

// Placeholder texts, not real content.
function article(sourceId: number, lang: Lang): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/${lang}/actualites/test-${String(sourceId)}/`;
  const translations: NewsArticle["translations"] = [
    {
      lang,
      status: "official",
      title: `Titre ${String(sourceId)}`,
      bodyHtml: "<p>Corps de test</p>",
      sourceUrl,
    },
  ];
  return {
    id: idOf(sourceId),
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-01-01",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, "2026-01-01", "communiques"),
    version: 1,
    lang,
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** Two pages: ids 3, 2 then 1 (newest first); id 2 fails to normalize. */
function fakeSource(): SourceProvider & { fetched: number[] } {
  const pages: number[][] = [[3, 2], [1]];
  const fetched: number[] = [];
  return {
    fetched,
    articleIdFor: (ref) => idOf(ref.sourceId),
    listPage: (lang, page) =>
      Promise.resolve({
        lastPage: pages.length,
        refs: (pages[page - 1] ?? []).map((sourceId): SourceArticleRef => ({
          sourceId,
          slug: `s${String(sourceId)}`,
          lang,
          sourceUpdatedAt: "",
        })),
      }),
    fetchArticle: (ref) => {
      fetched.push(ref.sourceId);
      return ref.sourceId === 2
        ? Promise.reject(Object.assign(new Error("broken"), { code: "INGESTION_QUARANTINED" }))
        : Promise.resolve(article(ref.sourceId, ref.lang));
    },
  };
}

describe("backfill", () => {
  let dir: string;
  let repo: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-backfill-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("imports every page, reports failures and progress", async () => {
    const onPage = vi.fn();
    const result = await backfill(fakeSource(), repo, "fr", { onPage });
    expect(result).toMatchObject({ page: 2, lastPage: 2, created: 2, updated: 0, skipped: 0 });
    expect(result.failures).toEqual([
      { ref: "s2", code: "INGESTION_QUARANTINED", message: "broken" },
    ]);
    expect(onPage).toHaveBeenCalledTimes(2);
  });

  it("resumes without calling the source again for what is already stored", async () => {
    await backfill(fakeSource(), repo, "fr");
    const again = fakeSource();
    const result = await backfill(again, repo, "fr");
    expect(result).toMatchObject({ created: 0, skipped: 2 });
    expect(again.fetched).toEqual([2]);
  });

  it("adds the other language to existing articles", async () => {
    await backfill(fakeSource(), repo, "fr");
    const result = await backfill(fakeSource(), repo, "wo");
    expect(result).toMatchObject({ created: 0, updated: 2, skipped: 0 });
    expect((await repo.get(idOf(3)))?.translations.map((t) => t.lang).sort()).toEqual(["fr", "wo"]);
  });

  it("stops after maxPages", async () => {
    const result = await backfill(fakeSource(), repo, "fr", { maxPages: 1 });
    expect(result.page).toBe(1);
  });

  it("reports non-coded errors as UNKNOWN", async () => {
    const source = fakeSource();
    source.fetchArticle = () => Promise.reject(new Error("boom"));
    const result = await backfill(source, repo, "fr", { maxPages: 1 });
    expect(result.failures[0]?.code).toBe("UNKNOWN");
  });
});
