import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";
import { nextPollDelayMs, pollOnce, SeenIndex } from "./watch";

const NOW = new Date("2026-09-25T10:00:00Z");

function idOf(sourceId: number): string {
  return `00000000-0000-5000-8000-${String(sourceId).padStart(12, "0")}`;
}

// Placeholder texts, not real content.
function article(sourceId: number, lang: Lang, title: string): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/${lang}/actualites/t-${String(sourceId)}/`;
  const translations: NewsArticle["translations"] = [
    { lang, status: "official", title, bodyHtml: "<p>Corps de test</p>", sourceUrl },
  ];
  return {
    id: idOf(sourceId),
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-25",
    sourceUpdatedAt: null,
    fetchedAt: NOW.toISOString(),
    contentHash: articleContentHash(translations, "2026-09-25", "communiques"),
    version: 1,
    lang,
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** A source whose first page and article titles can be changed between passes. */
function liveSource() {
  const state = {
    page: [{ sourceId: 1, updatedAt: "2026-09-25T09:59:00Z", title: "Premier" }],
    fetched: [] as number[],
    failing: false,
    cover: null as string | null,
  };
  const provider: SourceProvider = {
    articleIdFor: (ref) => idOf(ref.sourceId),
    downloadMedia: () => Promise.reject(new Error("no media")),
    listPage: (lang) =>
      Promise.resolve({
        lastPage: 1,
        refs: state.page.map((item): SourceArticleRef => ({
          sourceId: item.sourceId,
          slug: `s${String(item.sourceId)}`,
          lang,
          sourceUpdatedAt: item.updatedAt,
          coverSourceUrl: state.cover,
        })),
      }),
    fetchArticle: (ref) => {
      state.fetched.push(ref.sourceId);
      if (state.failing) {
        return Promise.reject(new Error("down"));
      }
      const item = state.page.find((entry) => entry.sourceId === ref.sourceId);
      return Promise.resolve(article(ref.sourceId, ref.lang, item?.title ?? "?"));
    },
  };
  return { state, provider };
}

describe("pollOnce", () => {
  let dir: string;
  let repo: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-watch-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("detects a new article and measures how fast", async () => {
    const { provider } = liveSource();
    const result = await pollOnce(provider, repo, ["fr"], new SeenIndex(), () => NOW);
    expect(result.outcomes.created).toBe(1);
    expect(result.detectionDelays).toEqual([60]);
  });

  it("does not fetch unchanged items again", async () => {
    const { state, provider } = liveSource();
    const seen = new SeenIndex();
    await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    expect(state.fetched).toEqual([1]);
  });

  it("versions an article edited at the source", async () => {
    const { state, provider } = liveSource();
    const seen = new SeenIndex();
    await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    state.page = [{ sourceId: 1, updatedAt: "2026-09-25T10:05:00Z", title: "Premier corrigé" }];
    const result = await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    expect(result.outcomes.updated).toBe(1);
    expect((await repo.get(idOf(1)))?.version).toBe(2);
  });

  it("retries failed items on the next pass and reports the failure", async () => {
    const { state, provider } = liveSource();
    const seen = new SeenIndex();
    state.failing = true;
    const failed = await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    expect(failed.failures[0]?.code).toBe("UNKNOWN");
    state.failing = false;
    const recovered = await pollOnce(provider, repo, ["fr"], seen, () => NOW);
    expect(recovered.outcomes.created).toBe(1);
  });

  it("ignores an unreadable source time when measuring delays", async () => {
    const { state, provider } = liveSource();
    state.page = [{ sourceId: 2, updatedAt: "", title: "Sans date" }];
    const result = await pollOnce(provider, repo, ["fr", "wo"], new SeenIndex(), () => NOW);
    expect(result.outcomes.updated + result.outcomes.created).toBe(2);
    expect(result.detectionDelays).toEqual([]);
  });

  it("keeps the article when its cover fails, and retries the cover next pass", async () => {
    const { state, provider } = liveSource();
    state.cover = "https://bo-admin.presidence.sn/storage/image/actualites/x.jpg";
    const media = { size: () => Promise.resolve(null), put: () => Promise.resolve() };
    const seen = new SeenIndex();
    const first = await pollOnce(provider, repo, ["fr"], seen, () => NOW, media);
    expect(first.outcomes.created).toBe(1);
    expect(first.failures[0]?.code).toBe("MEDIA_PROCESSING_FAILED");
    await pollOnce(provider, repo, ["fr"], seen, () => NOW, media);
    expect(state.fetched).toEqual([1, 1]);
  });

  it("reports non-Error failures as text", async () => {
    const { provider } = liveSource();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulates a misbehaving adapter
    provider.fetchArticle = () => Promise.reject("plain");
    const result = await pollOnce(provider, repo, ["fr"], new SeenIndex(), () => NOW);
    expect(result.failures[0]?.message).toBe("plain");
  });
});

describe("nextPollDelayMs", () => {
  it("polls every 30 s right after a publication", () => {
    expect(nextPollDelayMs(NOW, new Date("2026-09-25T09:45:00Z"))).toBe(30_000);
  });

  it("polls every minute during the day in Dakar", () => {
    expect(nextPollDelayMs(NOW, null)).toBe(60_000);
    expect(nextPollDelayMs(NOW, new Date("2026-09-25T08:00:00Z"))).toBe(60_000);
  });

  it("polls every 5 minutes at night", () => {
    expect(nextPollDelayMs(new Date("2026-09-25T02:00:00Z"), null)).toBe(300_000);
  });
});
