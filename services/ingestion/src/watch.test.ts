import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import { INGESTION_STOPPED_AFTER_MS, type Lang, type NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";
import {
  nextPollDelayMs,
  pollOnce,
  dueSources,
  pollSources,
  retryDelayMs,
  SeenIndex,
  watchedFrom,
} from "./watch";

const NOW = new Date("2026-09-25T10:00:00Z");

function idOf(sourceId: number): string {
  return `00000000-0000-5000-8000-${String(sourceId).padStart(12, "0")}`;
}

// Placeholder texts, not real content.
function article(
  sourceId: number,
  lang: Lang,
  title: string,
  bodyHtml = "<p>Corps de test</p>",
): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/${lang}/actualites/t-${String(sourceId)}/`;
  const translations: NewsArticle["translations"] = [
    { lang, status: "official", title, bodyHtml, sourceUrl },
  ];
  return {
    id: idOf(sourceId),
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
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
    body: undefined as string | undefined,
    downloads: 0,
  };
  const provider: SourceProvider = {
    articleIdFor: (ref) => idOf(Number(ref.sourceId)),
    downloadMedia: () => {
      state.downloads += 1;
      return Promise.reject(new Error("no media"));
    },
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
      state.fetched.push(Number(ref.sourceId));
      if (state.failing) {
        return Promise.reject(new Error("down"));
      }
      const item = state.page.find((entry) => entry.sourceId === ref.sourceId);
      return Promise.resolve(
        article(Number(ref.sourceId), ref.lang, item?.title ?? "?", state.body),
      );
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

  it("leaves the text images of a known, unchanged article to the images job", async () => {
    const { state, provider } = liveSource();
    state.body =
      '<p>Corps de test</p><p><img src="https://bo-admin.presidence.sn/storage/image/actualites/y.jpg" alt="" /></p>';
    const media = { size: () => Promise.resolve(null), put: () => Promise.resolve() };
    await pollOnce(provider, repo, ["fr"], new SeenIndex(), () => NOW, media);
    const tried = state.downloads;
    expect(tried).toBeGreaterThan(0);
    // A restart forgets what was seen: the article is read again, unchanged.
    const again = await pollOnce(provider, repo, ["fr"], new SeenIndex(), () => NOW, media);
    expect(again.outcomes.unchanged).toBe(1);
    expect(state.downloads).toBe(tried);
  });

  it("reports non-Error failures as text", async () => {
    const { provider } = liveSource();
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulates a misbehaving adapter
    provider.fetchArticle = () => Promise.reject("plain");
    const result = await pollOnce(provider, repo, ["fr"], new SeenIndex(), () => NOW);
    expect(result.failures[0]?.message).toBe("plain");
  });
});

describe("catching up after an outage", () => {
  let dir: string;
  let repo: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-catch-up-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** Newest first, two per page: 6 5 | 4 3 | 2 1 | … */
  function pagedSource(read: number[]): SourceProvider {
    return {
      articleIdFor: (ref) => idOf(Number(ref.sourceId)),
      downloadMedia: () => Promise.reject(new Error("no media")),
      listPage: (lang, page) => {
        read.push(page);
        const ids = [8 - 2 * page, 7 - 2 * page].filter((id) => id > 0);
        return Promise.resolve({
          lastPage: 9,
          refs: ids.map((sourceId) => ({
            sourceId,
            slug: `s${String(sourceId)}`,
            lang,
            sourceUpdatedAt: "2026-09-25T09:00:00Z",
            coverSourceUrl: null,
          })),
        });
      },
      fetchArticle: (ref) =>
        Promise.resolve(article(Number(ref.sourceId), ref.lang, `Titre ${ref.slug}`)),
    };
  }

  it("reads older pages until it meets an article it already had", async () => {
    await repo.save(article(1, "fr", "Titre s1"));
    await repo.save(article(2, "fr", "Titre s2"));
    const read: number[] = [];
    const result = await pollOnce(pagedSource(read), repo, ["fr"], new SeenIndex(), () => NOW);
    expect(result.outcomes.created).toBe(4);
    expect(read).toEqual([1, 2, 3]);
  });

  it("reads only the first page on an ordinary pass", async () => {
    const read: number[] = [];
    const seen = new SeenIndex();
    await pollOnce(pagedSource([]), repo, ["fr"], seen, () => NOW);
    await pollOnce(pagedSource(read), repo, ["fr"], seen, () => NOW);
    expect(read).toEqual([1]);
  });
});

describe("retryDelayMs", () => {
  it("spaces the tries while the source fails, up to every 10 minutes, never stopping", () => {
    const minutes = [1, 2, 3, 4, 50].map((failures) => retryDelayMs(failures) / 60_000);
    expect(minutes).toEqual([1, 2, 5, 10, 10]);
  });

  it("stays under the console's 'collection stopped' threshold", () => {
    expect(retryDelayMs(1000)).toBeLessThan(INGESTION_STOPPED_AFTER_MS);
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

describe("pollSources", () => {
  let dir: string;
  let repo: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-watch-sources-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function watched(name: string, provider: SourceProvider, essential: boolean, everyMs = 0) {
    return {
      institution: essential ? ("presidence" as const) : ("primature" as const),
      name,
      provider,
      langs: ["fr"] as const,
      everyMs,
      essential,
      seen: new SeenIndex(),
      lastPassAt: null,
    };
  }

  const down: SourceProvider = {
    ...liveSource().provider,
    listPage: () =>
      Promise.reject(
        Object.assign(new Error("site down"), { code: "INGESTION_SOURCE_UNREACHABLE" }),
      ),
  };

  it("reads every site, and lists a secondary site's outage without stopping", async () => {
    const reference = liveSource();
    const result = await pollSources(
      [watched("presidence.sn", reference.provider, true), watched("primature.sn", down, false)],
      repo,
      () => NOW,
    );
    expect(result.outcomes.created).toBe(1);
    expect(result.failures).toEqual([
      { ref: "primature.sn", code: "INGESTION_OTHER_SOURCE_UNREACHABLE", message: "site down" },
    ]);
  });

  it("fails the pass when the reference site is down", async () => {
    await expect(
      pollSources([watched("presidence.sn", down, true)], repo, () => NOW),
    ).rejects.toThrow("site down");
  });

  it("follows the sites the setting names, always the reference one", () => {
    const all = [watched("presidence.sn", down, true), watched("primature.sn", down, false)];
    const names = (setting: string | undefined) =>
      watchedFrom(all, setting).map((source) => source.name);
    expect(names(undefined)).toEqual(["presidence.sn", "primature.sn"]);
    expect(names("presidence")).toEqual(["presidence.sn"]);
    expect(names(" presidence , primature ")).toEqual(["presidence.sn", "primature.sn"]);
  });

  it("reads the reference site and only the secondary site that waited longest", () => {
    const reference = watched("presidence.sn", down, true);
    const recent = { ...watched("mesrisenegal.sn", down, false), lastPassAt: NOW };
    const never = watched("www.sante.gouv.sn", down, false);
    const older = {
      ...watched("primature.sn", down, false),
      lastPassAt: new Date(NOW.getTime() - 60_000),
    };
    const later = new Date(NOW.getTime() + 60_000);
    expect(dueSources([reference, recent, older, never], later).map((s) => s.name)).toEqual([
      "presidence.sn",
      "www.sante.gouv.sn",
    ]);
    expect(dueSources([reference, recent, older], later).map((s) => s.name)).toEqual([
      "presidence.sn",
      "primature.sn",
    ]);
  });

  it("reads a slower site only when its turn comes", async () => {
    const slow = liveSource();
    const sources = [watched("primature.sn", slow.provider, false, 15 * 60 * 1000)];
    slow.state.page = [];
    await pollSources(sources, repo, () => NOW);
    slow.state.page = [{ sourceId: 7, updatedAt: "2026-09-25T10:01:00Z", title: "Nouveau" }];
    const early = await pollSources(sources, repo, () => new Date(NOW.getTime() + 60_000));
    expect(early.outcomes.created).toBe(0);
    const onTime = await pollSources(sources, repo, () => new Date(NOW.getTime() + 15 * 60_000));
    expect(onTime.outcomes.created).toBe(1);
  });
});
