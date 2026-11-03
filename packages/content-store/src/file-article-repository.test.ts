import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ArticleRepository } from "./article-repository";
import { FileArticleRepository } from "./file-article-repository";
import { PostgresArticleRepository } from "./postgres-article-repository";
import { storages, type OpenedStore } from "./testing/stores";

const STORAGES = storages<ArticleRepository>(
  (path) => new FileArticleRepository(path),
  (database) => new PostgresArticleRepository(database),
);

// Placeholder texts, not real content.
function article(n: number, overrides: Partial<NewsArticle> = {}): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: `2026-09-${String(10 + n).padStart(2, "0")}`,
    sourceUpdatedAt: "2026-09-24T10:00:00Z",
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: `Titre ${String(n)}`,
        bodyHtml: "<p>Corps</p>",
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
    ...overrides,
  };
}

describe.each(STORAGES)("articles stored %s", (_name, open) => {
  let opened: OpenedStore<ArticleRepository>;
  let repo: ArticleRepository;
  beforeEach(async () => {
    opened = await open();
    repo = opened.store;
  });
  afterEach(async () => {
    await opened.close();
  });

  it("starts empty", async () => {
    expect(await repo.get("missing")).toBeNull();
    expect(await repo.list({ limit: 10 })).toEqual({ items: [], nextCursor: null, total: 0 });
    expect(await repo.sections({ perSection: 10 })).toEqual([]);
    expect(await repo.history("missing")).toEqual([]);
  });

  it("creates, then ignores an identical re-collection", async () => {
    expect(await repo.save(article(1))).toBe("created");
    expect(await repo.save(article(1, { fetchedAt: "2026-09-26T00:00:00Z" }))).toBe("unchanged");
    expect((await repo.get(article(1).id))?.version).toBe(1);
  });

  it("versions a changed article and keeps the previous version", async () => {
    await repo.save(article(1));
    const edited = article(1, { contentHash: "f".repeat(64) });
    expect(await repo.save(edited)).toBe("updated");
    expect((await repo.get(edited.id))?.version).toBe(2);
    const history = await repo.history(edited.id);
    expect(history.map((entry) => [entry.version, entry.contentHash])).toEqual([
      [1, article(1).contentHash],
    ]);
  });

  it("saves several articles at once, each as one save would", async () => {
    await repo.save(article(1));
    const edited = article(1, { contentHash: "f".repeat(64) });
    expect(await repo.saveMany([edited, article(2), article(3)])).toEqual([
      "updated",
      "created",
      "created",
    ]);
    expect(await repo.saveMany([article(2)])).toEqual(["unchanged"]);
    expect((await repo.get(edited.id))?.version).toBe(2);
    expect((await repo.list({ limit: 10 })).total).toBe(3);
  });

  it("attaches images without creating a new version", async () => {
    await repo.save(article(1));
    const image = {
      role: "cover" as const,
      originalUrl: "https://www.presidence.sn/media/a.jpg",
      originalKey: "images/a/original.jpg",
      width: 1200,
      height: 800,
      alt: null,
      blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      variants: [{ format: "jpeg" as const, width: 960, key: "images/a/960.jpg", bytes: 1000 }],
    };
    expect(await repo.setImages(article(1).id, [image])).toBe(true);
    const stored = await repo.get(article(1).id);
    expect(stored?.images).toEqual([image]);
    expect(stored?.version).toBe(1);
    expect(await repo.setImages("missing", [image])).toBe(false);
    const pdf = {
      sourceUrl: "https://www.presidence.sn/fr/assets/documents/test.pdf",
      key: "documents/test.pdf",
      title: "Document de test",
      mimeType: "application/pdf" as const,
      bytes: 2048,
      contentHash: "a".repeat(64),
    };
    expect(await repo.setAttachments(article(1).id, [pdf])).toBe(true);
    expect((await repo.get(article(1).id))?.attachments).toEqual([pdf]);
    expect((await repo.get(article(1).id))?.version).toBe(1);
  });

  it("attaches one recording per language, the newest replacing the older, no new version", async () => {
    await repo.save(article(1));
    const id = article(1).id;
    const track = {
      lang: "fr" as const,
      origin: "tts" as const,
      key: "audio/test/fr-1.mp3",
      format: "mp3" as const,
      durationMs: 42_000,
      bytes: 120_000,
      textHash: "a".repeat(64),
      createdAt: "2026-10-08T10:00:00Z",
    };
    expect(await repo.setAudioTrack(id, track)).toBe(true);
    expect(await repo.setAudioTrack(id, { ...track, key: "audio/test/fr-2.mp3" })).toBe(true);
    const stored = await repo.get(id);
    expect(stored?.audio.map((t) => t.key)).toEqual(["audio/test/fr-2.mp3"]);
    expect(stored?.version).toBe(1);
    expect(await repo.setAudioTrack(article(9).id, track)).toBe(false);
  });

  it("hides a version the source withdrew, keeps its words, and shows it again", async () => {
    await repo.save(article(1));
    await repo.save(article(2));
    const id = article(1).id;
    expect(await repo.setWithdrawn(id, "fr", "2026-09-28T02:00:00Z")).toBe(true);
    expect((await repo.list({ lang: "fr", limit: 10 })).items.map((a) => a.id)).toEqual([
      article(2).id,
    ]);
    expect((await repo.sections({ lang: "fr", perSection: 10 }))[0]?.total).toBe(1);
    const all = await repo.list({ limit: 10, includeWithdrawn: true });
    expect(all.total).toBe(2);
    const stored = await repo.get(id);
    expect(stored?.translations[0]).toMatchObject({
      title: "Titre 1",
      withdrawnAt: "2026-09-28T02:00:00Z",
    });
    expect(stored?.version).toBe(1);
    await repo.setWithdrawn(id, "fr", null);
    expect((await repo.get(id))?.translations[0]).not.toHaveProperty("withdrawnAt");
    expect((await repo.list({ limit: 10 })).total).toBe(2);
    expect(await repo.setWithdrawn("missing", "fr", null)).toBe(false);
  });

  it("deletes an article with its history, and gives back what it deleted", async () => {
    // DATA-10: WordPress sample posts collected as news, deleted on the owner's decision.
    await repo.save(article(1));
    await repo.save(article(1, { contentHash: "f".repeat(64) }));
    await repo.save(article(2));
    const id = article(1).id;
    const removed = await repo.remove(id);
    expect(removed?.current.version).toBe(2);
    expect(removed?.history.map((a) => a.version)).toEqual([1]);
    expect(await repo.get(id)).toBeNull();
    expect(await repo.history(id)).toEqual([]);
    expect((await repo.list({ limit: 10, includeWithdrawn: true })).items.map((a) => a.id)).toEqual(
      [article(2).id],
    );
    expect(await repo.remove(id)).toBeNull();
  });

  it("hides a duplicate from the app, notes it on the reference, and can show it again", async () => {
    await repo.save(article(1));
    await repo.save(article(2));
    const [duplicate, reference] = [article(1).id, article(2).id];
    const other = { publisher: "presidence" as const, sourceUrl: article(1).sourceUrl };
    expect(await repo.setDuplicateOf(duplicate, reference)).toBe(true);
    expect(await repo.setAlsoPublishedBy(reference, [other])).toBe(true);
    expect((await repo.list({ lang: "fr", limit: 10 })).items.map((a) => a.id)).toEqual([
      reference,
    ]);
    expect((await repo.sections({ lang: "fr", perSection: 10 }))[0]?.total).toBe(1);
    expect((await repo.list({ limit: 10, includeWithdrawn: true })).total).toBe(2);
    expect((await repo.get(duplicate))?.version).toBe(1);
    expect((await repo.get(reference))?.alsoPublishedBy).toEqual([other]);
    await repo.setDuplicateOf(duplicate, null);
    expect((await repo.get(duplicate))?.duplicateOf).toBeUndefined();
    expect((await repo.list({ limit: 10 })).total).toBe(2);
    expect(await repo.setDuplicateOf("missing", null)).toBe(false);
  });

  it("lists newest first with cursor pagination", async () => {
    for (const n of [1, 3, 2]) {
      await repo.save(article(n));
    }
    const first = await repo.list({ limit: 2 });
    expect(first.items.map((item) => item.sourcePublishedOn)).toEqual(["2026-09-13", "2026-09-12"]);
    expect(first.nextCursor).toBe(article(2).id);
    const second = await repo.list({ limit: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items.map((item) => item.sourcePublishedOn)).toEqual(["2026-09-11"]);
    expect(second.nextCursor).toBeNull();
  });

  it("serves numbered pages with the total", async () => {
    for (const n of [1, 2, 3, 4, 5]) {
      await repo.save(article(n));
    }
    const page2 = await repo.list({ limit: 2, offset: 2 });
    expect(page2.items.map((item) => item.sourcePublishedOn)).toEqual(["2026-09-13", "2026-09-12"]);
    expect(page2.total).toBe(5);
    expect((await repo.list({ limit: 2, offset: 10 })).items).toEqual([]);
  });

  it("gives the newest articles of each section, newest section first", async () => {
    await repo.save(article(1, { category: "discours" }));
    await repo.save(article(2));
    await repo.save(article(3));
    await repo.save(article(4, { category: "discours" }));
    await repo.save(article(5, { category: "agenda" }));
    const sections = await repo.sections({ perSection: 1 });
    expect(sections.map(({ category, total }) => [category, total])).toEqual([
      ["agenda", 1],
      ["discours", 2],
      ["communiques", 2],
    ]);
    expect(sections[1]?.items.map((item) => item.id)).toEqual([article(4).id]);
  });

  it("orders same-day articles by source update time", async () => {
    await repo.save(article(1, { sourceUpdatedAt: "2026-09-11T08:00:00Z" }));
    await repo.save(
      article(2, { sourcePublishedOn: "2026-09-11", sourceUpdatedAt: "2026-09-11T09:00:00Z" }),
    );
    const { items } = await repo.list({ limit: 5 });
    expect(items.map((item) => item.id)).toEqual([article(2).id, article(1).id]);
  });

  it("filters by section", async () => {
    await repo.save(article(1));
    await repo.save(article(2, { category: "conseil-des-ministres" }));
    const { items } = await repo.list({ limit: 5, category: "conseil-des-ministres" });
    expect(items.map((item) => item.id)).toEqual([article(2).id]);
  });

  it("filters by institution, a duplicate counting for each institution that published it", async () => {
    const primature = (n: number, overrides: Partial<NewsArticle> = {}) => {
      const sourceUrl = `https://primature.sn/publications/actualites/test-${String(n)}`;
      const base = article(n);
      return article(n, {
        publisher: "primature",
        sourceUrl,
        translations: base.translations.map((translation) => ({ ...translation, sourceUrl })),
        ...overrides,
      });
    };
    await repo.save(article(1));
    await repo.save(
      article(2, {
        alsoPublishedBy: [
          { publisher: "primature", sourceUrl: "https://primature.sn/publications/actualites/x" },
        ],
      }),
    );
    await repo.save(primature(3, { fetchedAt: "2026-09-26T08:00:00Z" }));
    const ids = async (publisher: "presidence" | "primature" | "sante") =>
      (await repo.list({ limit: 5, publisher })).items.map((item) => item.id);
    expect(await ids("primature")).toEqual([article(3).id, article(2).id]);
    expect(await ids("presidence")).toEqual([article(2).id, article(1).id]);
    expect(await ids("sante")).toEqual([]);
    expect(await repo.publishers("fr")).toEqual([
      {
        publisher: "presidence",
        total: 2,
        newestOn: article(2).sourcePublishedOn,
        lastFetchedAt: "2026-09-25T10:00:00Z",
      },
      {
        publisher: "primature",
        total: 2,
        newestOn: article(3).sourcePublishedOn,
        lastFetchedAt: "2026-09-26T08:00:00Z",
      },
    ]);
    expect(await repo.publishers("wo")).toEqual([]);
  });

  it("filters as the « Filtrer » panel asks: sections, institutions, period, Wolof, audio, PDF, order", async () => {
    const wolof = article(3).translations.map((translation) => ({
      ...translation,
      lang: "wo" as const,
      title: "Tiitar 3",
    }));
    await repo.save(article(1));
    await repo.save(article(2, { category: "discours" }));
    await repo.save(article(3, { translations: [...article(3).translations, ...wolof] }));
    await repo.save(
      article(4, {
        category: "discours",
        attachments: [
          {
            sourceUrl: "https://www.presidence.sn/fr/document-test.pdf",
            key: "documents/test/4.pdf",
            title: null,
            mimeType: "application/pdf",
            bytes: 1000,
            contentHash: "b".repeat(64),
          },
        ],
      }),
    );
    await repo.setAudioTrack(article(1).id, {
      lang: "fr",
      origin: "tts",
      key: "audio/test/fr-1.mp3",
      format: "mp3",
      durationMs: 42_000,
      bytes: 120_000,
      textHash: "a".repeat(64),
      createdAt: "2026-10-08T10:00:00Z",
    });
    const ids = async (query: Omit<Parameters<ArticleRepository["list"]>[0], "limit">) => {
      const page = await repo.list({ lang: "fr", limit: 10, ...query });
      return { ids: page.items.map((item) => item.id.slice(-1)), total: page.total };
    };
    expect(await ids({ categories: ["discours", "communiques"] })).toEqual({
      ids: ["4", "3", "2", "1"],
      total: 4,
    });
    expect(await ids({ categories: ["discours"], oldestFirst: true })).toEqual({
      ids: ["2", "4"],
      total: 2,
    });
    expect(await ids({ publishers: ["primature", "presidence"], since: "2026-09-13" })).toEqual({
      ids: ["4", "3"],
      total: 2,
    });
    expect(await ids({ alsoIn: "wo" })).toEqual({ ids: ["3"], total: 1 });
    expect(await ids({ withAudio: true })).toEqual({ ids: ["1"], total: 1 });
    expect(await ids({ withDocuments: true })).toEqual({ ids: ["4"], total: 1 });
    expect(await ids({ publishers: ["sante"] })).toEqual({ ids: [], total: 0 });
  });

  it("filters by language", async () => {
    await repo.save(article(1));
    expect((await repo.list({ lang: "wo", limit: 5 })).items).toEqual([]);
    expect((await repo.list({ lang: "fr", limit: 5 })).items).toHaveLength(1);
  });

  it("starts from the top when the cursor is unknown", async () => {
    await repo.save(article(1));
    await repo.save(article(2));
    const page = await repo.list({ limit: 1, cursor: "unknown" });
    expect(page.items.map((item) => item.id)).toEqual([article(2).id]);
    expect(page.nextCursor).toBe(article(2).id);
  });

  it("orders same-day, same-time articles by id, across pages", async () => {
    const sameMoment = { sourcePublishedOn: "2026-09-20", sourceUpdatedAt: "2026-09-20T08:00:00Z" };
    for (const n of [3, 1, 2]) {
      await repo.save(article(n, sameMoment));
    }
    const first = await repo.list({ limit: 2 });
    const second = await repo.list({ limit: 2, cursor: first.nextCursor ?? undefined });
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(
      [1, 2, 3].map((n) => article(n).id),
    );
  });
});

describe("articles in a file", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-store-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("survives a main file zeroed by a power cut, thanks to its backup (25/09/2026)", async () => {
    const path = join(dir, "news.json");
    const store = new FileArticleRepository(path);
    await store.save(article(1));
    await writeFile(path, Buffer.alloc(4096));
    expect((await store.get(article(1).id))?.id).toBe(article(1).id);
    await store.save(article(2));
    expect((await new FileArticleRepository(path).list({ limit: 5 })).items).toHaveLength(2);
  });

  it("refuses a corrupted store instead of serving bad data", async () => {
    const path = join(dir, "broken.json");
    await writeFile(path, JSON.stringify({ schemaVersion: 1, articles: { x: { current: {} } } }));
    await expect(new FileArticleRepository(path).get("x")).rejects.toThrow();
  });
});
