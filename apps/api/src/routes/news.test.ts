import {
  apiErrorSchema,
  newsDetailSchema,
  newsListResponseSchema,
  type NewsArticle,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

// Placeholder texts, not real content.
function article(n: number, langs: ("fr" | "wo")[] = ["fr"]): NewsArticle {
  const url = (lang: string) => `https://www.presidence.sn/${lang}/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    category: "communiques",
    sourceUrl: url(langs[0] ?? "fr"),
    sourcePublishedOn: `2026-09-${String(10 + n)}`,
    sourceUpdatedAt: "2026-09-24T10:00:00Z",
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang: langs[0] ?? "fr",
    translations: langs.map((lang) => ({
      lang,
      status: "official" as const,
      title: `Titre ${lang} ${String(n)}`,
      bodyHtml: `<p>Premier paragraphe ${String(n)}.</p><p>Suite.</p>`,
      sourceUrl: url(lang),
    })),
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

let app: FastifyInstance;

beforeEach(async () => {
  const articles = temporaryStore();
  for (const item of [article(1), article(2, ["fr", "wo"]), article(3)]) {
    await articles.save(item);
  }
  app = await buildApp({ config: loadConfig({ LOG_LEVEL: "silent" }), version: "1.0.0", articles });
});

afterEach(async () => {
  await app.close();
});

describe("GET /v1/news", () => {
  it("lists articles newest first, in French by default, cacheable", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/news?limit=2" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("stale-while-revalidate");
    const body = newsListResponseSchema.parse(response.json());
    expect(body.items.map((item) => item.title)).toEqual(["Titre fr 3", "Titre fr 2"]);
    expect(body.items[0]?.excerpt).toBe("Premier paragraphe 3.");
    expect(body.nextCursor).toBe(article(2).id);

    const next = await app.inject({
      method: "GET",
      url: `/v1/news?limit=2&cursor=${String(body.nextCursor)}`,
    });
    expect(newsListResponseSchema.parse(next.json()).items.map((i) => i.title)).toEqual([
      "Titre fr 1",
    ]);
  });

  it("lists only articles available in Wolof when asked", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/news?lang=wo" });
    const body = newsListResponseSchema.parse(response.json());
    expect(body.items.map((item) => [item.title, item.availableLangs])).toEqual([
      ["Titre wo 2", ["fr", "wo"]],
    ]);
  });

  it("answers 304 when the client already has this page", async () => {
    const first = await app.inject({ method: "GET", url: "/v1/news" });
    const etag = String(first.headers.etag);
    const again = await app.inject({
      method: "GET",
      url: "/v1/news",
      headers: { "if-none-match": etag },
    });
    expect(again.statusCode).toBe(304);
  });

  it("filters by section, and refuses a malformed section", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/news?category=communiques" });
    expect(newsListResponseSchema.parse(response.json()).items).toHaveLength(3);
    const none = await app.inject({
      method: "GET",
      url: "/v1/news?category=conseil-des-ministres",
    });
    expect(newsListResponseSchema.parse(none.json()).items).toEqual([]);
    expect((await app.inject({ method: "GET", url: "/v1/news?category=../x" })).statusCode).toBe(
      400,
    );
  });

  it("searches the news, and refuses a query too short", async () => {
    const found = await app.inject({ method: "GET", url: "/v1/news/search?q=TITRE%20wo" });
    expect(found.statusCode).toBe(200);
    expect(newsListResponseSchema.parse(found.json()).items).toEqual([]);
    const fr = await app.inject({
      method: "GET",
      url: "/v1/news/search?q=premier%20paragraphe%203",
    });
    expect(newsListResponseSchema.parse(fr.json()).items.map((item) => item.title)).toEqual([
      "Titre fr 3",
    ]);
    expect((await app.inject({ method: "GET", url: "/v1/news/search?q=a" })).statusCode).toBe(400);
  });

  it("rejects an invalid language or limit", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/news?lang=en" })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/v1/news?limit=500" })).statusCode).toBe(400);
  });
});

describe("GET /v1/news/:id", () => {
  it("returns the article as structured blocks with its official source", async () => {
    const response = await app.inject({ method: "GET", url: `/v1/news/${article(2).id}?lang=wo` });
    expect(response.statusCode).toBe(200);
    const detail = newsDetailSchema.parse(response.json());
    expect(detail.title).toBe("Titre wo 2");
    expect(detail.sourceUrl).toBe("https://www.presidence.sn/wo/actualites/test-2/");
    expect(detail.blocks).toEqual([
      { type: "paragraph", inlines: [{ text: "Premier paragraphe 2." }] },
      { type: "paragraph", inlines: [{ text: "Suite." }] },
    ]);
  });

  it("answers 304 on a matching ETag", async () => {
    const url = `/v1/news/${article(1).id}`;
    const etag = String((await app.inject({ method: "GET", url })).headers.etag);
    expect(
      (await app.inject({ method: "GET", url, headers: { "if-none-match": etag } })).statusCode,
    ).toBe(304);
  });

  it.each([
    ["an unknown article", `/v1/news/${article(9).id}`],
    ["a missing language", `/v1/news/${article(1).id}?lang=wo`],
  ])("returns NEWS_NOT_FOUND for %s", async (_label, url) => {
    const response = await app.inject({ method: "GET", url });
    expect(response.statusCode).toBe(404);
    expect(apiErrorSchema.parse(response.json()).code).toBe("NEWS_NOT_FOUND");
  });

  it("rejects a malformed id", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/news/not-a-uuid" })).statusCode).toBe(400);
  });
});
