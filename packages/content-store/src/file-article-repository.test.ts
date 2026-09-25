import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileArticleRepository } from "./file-article-repository";

let dir: string;
let repo: FileArticleRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-store-"));
  repo = new FileArticleRepository(join(dir, "nested", "news.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

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

describe("FileArticleRepository", () => {
  it("starts empty when the file does not exist", async () => {
    expect(await repo.get("missing")).toBeNull();
    expect(await repo.list({ limit: 10 })).toEqual({ items: [], nextCursor: null });
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

  it("orders same-day articles by source update time", async () => {
    await repo.save(article(1, { sourceUpdatedAt: "2026-09-11T08:00:00Z" }));
    await repo.save(
      article(2, { sourcePublishedOn: "2026-09-11", sourceUpdatedAt: "2026-09-11T09:00:00Z" }),
    );
    const { items } = await repo.list({ limit: 5 });
    expect(items.map((item) => item.id)).toEqual([article(2).id, article(1).id]);
  });

  it("filters by language", async () => {
    await repo.save(article(1));
    expect((await repo.list({ lang: "wo", limit: 5 })).items).toEqual([]);
    expect((await repo.list({ lang: "fr", limit: 5 })).items).toHaveLength(1);
  });

  it("refuses a corrupted store instead of serving bad data", async () => {
    const path = join(dir, "broken.json");
    await writeFile(path, JSON.stringify({ schemaVersion: 1, articles: { x: { current: {} } } }));
    await expect(new FileArticleRepository(path).get("x")).rejects.toThrow();
  });
});
