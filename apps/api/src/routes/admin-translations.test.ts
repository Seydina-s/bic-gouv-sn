import { articleContentHash, type FileArticleRepository } from "@bgs/content-store";
import {
  translationReviewDetailSchema,
  translationsToReviewSchema,
  type NewsArticle,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

function article(n: number, wolof: "machine" | "official" | null): NewsArticle {
  const url = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: `Titre fictif ${String(n)}`,
      bodyHtml: "<p>Premier paragraphe fictif.</p><p>Second paragraphe fictif.</p>",
      sourceUrl: url,
    },
  ];
  if (wolof === "machine") {
    translations.push({
      lang: "wo",
      status: "machine",
      title: `Tur bu fictif ${String(n)}`,
      bodyHtml: "<p>Xaaj bu jëkk.</p><p>Xaaj bu ñaareel.</p>",
    });
  }
  if (wolof === "official") {
    translations.push({
      lang: "wo",
      status: "official",
      title: `Tur bu fictif ${String(n)}`,
      bodyHtml: "<p>Xaaj.</p>",
      sourceUrl: url.replace("/fr/", "/wo/"),
    });
  }
  return {
    id: idOf(n),
    kind: "news-article",
    category: "communiques",
    sourceUrl: url,
    sourcePublishedOn: `2025-11-0${String(n)}`,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, `2025-11-0${String(n)}`, "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

let app: FastifyInstance;
let articles: FileArticleRepository;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  admin = await adminForTests();
  articles = temporaryStore();
  await articles.save(article(1, "machine"));
  await articles.save(article(2, "machine"));
  await articles.save(article(3, "official"));
  await articles.save(article(4, null));
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

async function as(role: "reviewer" | "editor" | "admin") {
  return { authorization: `Bearer ${await admin.tokenFor(role)}` };
}

describe("the review of machine translations", () => {
  it("lists only the machine Wolof, newest first, and shows one side by side", async () => {
    const headers = await as("reviewer");
    const list = await app.inject({ method: "GET", url: "/admin/v1/translations", headers });
    expect(list.statusCode).toBe(200);
    expect(
      translationsToReviewSchema.parse(list.json()).translations.map((item) => item.articleId),
    ).toEqual([idOf(2), idOf(1)]);

    const detail = await app.inject({
      method: "GET",
      url: `/admin/v1/translations/${idOf(1)}`,
      headers,
    });
    expect(translationReviewDetailSchema.parse(detail.json())).toMatchObject({
      french: { paragraphs: ["Premier paragraphe fictif.", "Second paragraphe fictif."] },
      wolof: { title: "Tur bu fictif 1", paragraphs: ["Xaaj bu jëkk.", "Xaaj bu ñaareel."] },
    });
    const official = await app.inject({
      method: "GET",
      url: `/admin/v1/translations/${idOf(3)}`,
      headers,
    });
    expect(official.statusCode).toBe(409);
  });

  it("validates one (no more label) and sets another aside, each a journaled new version", async () => {
    const headers = await as("reviewer");
    const decide = (n: number, decision: string) =>
      app.inject({
        method: "POST",
        url: `/admin/v1/translations/${idOf(n)}/decision`,
        headers,
        payload: { decision },
      });
    expect((await decide(1, "validate")).statusCode).toBe(200);
    expect((await decide(2, "set-aside")).statusCode).toBe(200);
    // Decided once: a second decision is refused, the first one kept.
    const again = await decide(1, "set-aside");
    expect(again.statusCode).toBe(409);
    expect(again.json<{ code: string }>().code).toBe("TRANSLATION_NOT_PENDING");
    expect((await decide(9, "validate")).statusCode).toBe(404);

    const validated = await articles.get(idOf(1));
    expect(validated?.version).toBe(2);
    expect(validated?.translations.find((t) => t.lang === "wo")).toMatchObject({
      status: "reviewed",
      review: { reviewerId: expect.any(String) as string },
    });
    expect((await articles.get(idOf(2)))?.translations.map((t) => t.lang)).toEqual(["fr"]);
    const actions = (await admin.admin.journal.entries()).map((entry) => entry.action);
    expect(actions).toEqual(
      expect.arrayContaining(["translation.validated", "translation.set-aside"]),
    );
    const list = await app.inject({ method: "GET", url: "/admin/v1/translations", headers });
    expect(translationsToReviewSchema.parse(list.json()).translations).toEqual([]);
  });

  it("refuses an unknown decision or a malformed id", async () => {
    const headers = await as("reviewer");
    const wrong = await app.inject({
      method: "POST",
      url: `/admin/v1/translations/${idOf(1)}/decision`,
      headers,
      payload: { decision: "publish" },
    });
    expect(wrong.statusCode).toBe(400);
    const malformed = await app.inject({
      method: "GET",
      url: "/admin/v1/translations/pas-un-id",
      headers,
    });
    expect(malformed.statusCode).toBe(400);
  });
});
