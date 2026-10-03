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
