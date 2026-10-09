import { withdrawnArticlesResponseSchema, type NewsArticle } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder texts, not real content.
function article(n: number): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-20",
    sourceUpdatedAt: null,
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
  };
}

let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  const articles = temporaryStore();
  await articles.save(article(1));
  await articles.save(article(2));
  await articles.setWithdrawn(article(2).id, "fr", "2026-09-28T02:00:00Z");
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles,
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
});

describe("GET /admin/v1/news/withdrawn", () => {
  it("lists the hidden articles for every console role, with their trace", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/news/withdrawn",
      headers: { authorization: `Bearer ${await admin.tokenFor("reviewer")}` },
    });
    expect(response.statusCode).toBe(200);
    expect(withdrawnArticlesResponseSchema.parse(response.json()).articles).toEqual([
      {
        id: article(2).id,
        lang: "fr",
        title: "Titre 2",
        category: "communiques",
        sourceUrl: article(2).sourceUrl,
        withdrawnAt: "2026-09-28T02:00:00Z",
      },
    ]);
  });

  it("refuses without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/admin/v1/news/withdrawn" });
    expect(response.statusCode).toBe(401);
  });
});
