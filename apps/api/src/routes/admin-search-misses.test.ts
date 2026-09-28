import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { searchMissesResponseSchema, type NewsArticle } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { SearchMisses } from "../journal/search-misses";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder text, not real content.
const sourceUrl = "https://www.presidence.sn/fr/actualites/test-1/";
const article: NewsArticle = {
  id: "00000000-0000-5000-8000-000000000001",
  kind: "news-article",
  category: "communiques",
  sourceUrl,
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
      title: "Conseil des ministres",
      bodyHtml: "<p>Corps</p>",
      sourceUrl,
    },
  ],
  audio: [],
  embedding: null,
  images: [],
  attachments: [],
};

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-misses-"));
  const articles = temporaryStore();
  await articles.save(article);
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles,
    admin: admin.admin,
    searchMisses: await SearchMisses.open(join(dir, "search-misses.json")),
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const search = (q: string) =>
  app.inject({ method: "GET", url: `/v1/news/search?q=${encodeURIComponent(q)}` });

describe("searches that found nothing", () => {
  it("reach the console from the third time, and a fruitful search is not counted", async () => {
    for (let i = 0; i < 3; i += 1) {
      await search("Bourse étudiante");
      await search("conseil");
    }
    await search("rare");
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/search-misses",
      headers: { authorization: `Bearer ${await admin.tokenFor("reviewer")}` },
    });
    expect(response.statusCode).toBe(200);
    expect(searchMissesResponseSchema.parse(response.json())).toEqual({
      minCount: 3,
      entries: [
        {
          area: "news",
          lang: "fr",
          query: "bourse étudiante",
          count: 3,
          lastOn: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  });

  it("refuses without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/admin/v1/search-misses" });
    expect(response.statusCode).toBe(401);
  });
});
