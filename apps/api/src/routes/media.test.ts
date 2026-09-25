import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newsDetailSchema, newsListResponseSchema, type Image } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

const ID = "00000000-0000-5000-8000-000000000001";
const SOURCE = "https://www.presidence.sn/fr/actualites/test-1/";

const COVER: Image = {
  originalUrl: "https://bo-admin.presidence.sn/storage/image/actualites/test.jpg",
  originalKey: "images/abc/original.jpg",
  width: 1200,
  height: 800,
  alt: null,
  blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
  variants: [
    { format: "webp", width: 480, key: "images/abc/480.webp", bytes: 4 },
    { format: "jpeg", width: 480, key: "images/abc/480.jpg", bytes: 4 },
  ],
};

// Placeholder texts, not real content.
async function storeWithOneArticle() {
  const articles = temporaryStore();
  await articles.save({
    id: ID,
    kind: "news-article",
    category: "communiques",
    sourceUrl: SOURCE,
    sourcePublishedOn: "2026-09-20",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: "1".repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: "Titre",
        bodyHtml: "<p>Corps.</p>",
        sourceUrl: SOURCE,
      },
    ],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  });
  return articles;
}

describe("cover photos", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-media-"));
    await mkdir(join(dir, "images", "abc"), { recursive: true });
    await writeFile(join(dir, "images", "abc", "480.webp"), "webp");
    await writeFile(join(dir, ".secret"), "no");
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("has no cover until the ingestion attaches one, then changes the ETag", async () => {
    const articles = await storeWithOneArticle();
    app = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent", MEDIA_ROOT: dir }),
      version: "1.0.0",
      articles,
    });
    const before = await app.inject({ method: "GET", url: "/v1/news" });
    expect(newsListResponseSchema.parse(before.json()).items[0]?.cover).toBeNull();

    await articles.setImages(ID, [COVER]);
    const after = await app.inject({
      method: "GET",
      url: "/v1/news",
      headers: { "if-none-match": String(before.headers.etag) },
    });
    expect(after.statusCode).toBe(200);
    const cover = newsListResponseSchema.parse(after.json()).items[0]?.cover;
    expect(cover).toMatchObject({ width: 1200, height: 800, blurhash: COVER.blurhash });
    expect(cover?.sources[0]).toEqual({
      format: "webp",
      width: 480,
      url: "http://localhost:80/media/images/abc/480.webp",
    });

    const detail = await app.inject({ method: "GET", url: `/v1/news/${ID}` });
    expect(newsDetailSchema.parse(detail.json()).cover?.sources).toHaveLength(2);
  });

  it("serves the media folder read-only, cacheable, without escaping it", async () => {
    app = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent", MEDIA_ROOT: dir }),
      version: "1.0.0",
      articles: temporaryStore(),
    });
    const file = await app.inject({ method: "GET", url: "/media/images/abc/480.webp" });
    expect(file.statusCode).toBe(200);
    expect(file.body).toBe("webp");
    expect(file.headers["cache-control"]).toContain("max-age=604800");

    for (const url of [
      "/media/.secret",
      "/media/../package.json",
      "/media/%2e%2e/package.json",
      "/media/images/",
    ]) {
      expect((await app.inject({ method: "GET", url })).statusCode).toBeGreaterThanOrEqual(400);
    }
  });

  it("points to the CDN when one is configured, and serves nothing itself", async () => {
    const articles = await storeWithOneArticle();
    await articles.setImages(ID, [COVER]);
    app = await buildApp({
      config: loadConfig({
        LOG_LEVEL: "silent",
        MEDIA_ROOT: dir,
        MEDIA_BASE_URL: "https://cdn.example.org/media",
      }),
      version: "1.0.0",
      articles,
    });
    const list = await app.inject({ method: "GET", url: "/v1/news" });
    expect(newsListResponseSchema.parse(list.json()).items[0]?.cover?.sources[0]?.url).toBe(
      "https://cdn.example.org/media/images/abc/480.webp",
    );
    expect(
      (await app.inject({ method: "GET", url: "/media/images/abc/480.webp" })).statusCode,
    ).toBe(404);
  });
});
