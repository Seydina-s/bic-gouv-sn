import { createHash } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  langSchema,
  slugSchema,
  newsDetailSchema,
  newsListResponseSchema,
  newsSectionsResponseSchema,
  type ErrorCode,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { freshnessKey, toDetail, toSummary } from "../news/present";
import { searchArticles } from "../news/search";
import { mediaBaseUrlFor } from "./media";

export interface NewsRoutesOptions {
  articles: ArticleRepository;
  /** Public address of media; absent in development (served by this API). */
  mediaBaseUrl: string | undefined;
}

/**
 * Read-heavy public content: short freshness, long stale-while-revalidate so CDNs
 * and the app keep serving while a new version is fetched (CLAUDE.md §4.2).
 */
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=600";

const NOT_FOUND: ErrorCode = "NEWS_NOT_FOUND";

/** Searches change with every publication: a short shared cache only. */
const SEARCH_CACHE_CONTROL = "public, max-age=60";

/** Answers 304 when the client already holds this exact content. */
function sendCached<T>(request: FastifyRequest, reply: FastifyReply, fingerprint: string, body: T) {
  const etag = `"${createHash("sha256").update(fingerprint).digest("base64url").slice(0, 27)}"`;
  void reply.header("etag", etag).header("cache-control", CACHE_CONTROL);
  if (request.headers["if-none-match"] === etag) {
    return reply.code(304).send();
  }
  return body;
}

export const newsRoutes: FastifyPluginAsyncZod<NewsRoutesOptions> = (
  app,
  { articles, mediaBaseUrl },
) => {
  app.get(
    "/news/search",
    {
      schema: {
        tags: ["news"],
        summary: "Search the official news (accents and case ignored)",
        querystring: z.object({
          q: z.string().trim().min(2).max(120),
          lang: langSchema.default("fr"),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
        response: { 200: newsListResponseSchema },
      },
    },
    async (request, reply) => {
      const { q, lang, limit } = request.query;
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const hits = await searchArticles(articles, { query: q, lang, limit });
      void reply.header("cache-control", SEARCH_CACHE_CONTROL);
      return {
        items: hits.flatMap((article) => toSummary(article, lang, media) ?? []),
        nextCursor: null,
      };
    },
  );

  app.get(
    "/news",
    {
      schema: {
        tags: ["news"],
        summary: "Latest official news, newest first",
        querystring: z.object({
          lang: langSchema.default("fr"),
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.uuid().optional(),
          /** Numbered page, from 1 (ignored when a cursor is given). */
          page: z.coerce.number().int().min(1).max(10_000).optional(),
          /** Only this section, e.g. the latest Conseil des ministres. */
          category: slugSchema.optional(),
        }),
        response: { 200: newsListResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { lang, limit, cursor, page: pageNumber, category } = request.query;
      const offset =
        cursor === undefined && pageNumber !== undefined ? (pageNumber - 1) * limit : 0;
      const page = await articles.list({ lang, limit, cursor, offset, category });
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const items = page.items.flatMap((article) => toSummary(article, lang, media) ?? []);
      const fingerprint = [
        lang,
        cursor,
        offset,
        category,
        media,
        page.total,
        ...page.items.map(freshnessKey),
      ].join("|");
      return sendCached(request, reply, fingerprint, {
        items,
        nextCursor: page.nextCursor,
        total: page.total,
      });
    },
  );

  app.get(
    "/news/sections",
    {
      schema: {
        tags: ["news"],
        summary: "The newest articles of each section, for the front page rows",
        querystring: z.object({
          lang: langSchema.default("fr"),
          perSection: z.coerce.number().int().min(1).max(20).default(10),
        }),
        response: { 200: newsSectionsResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { lang, perSection } = request.query;
      const sections = await articles.sections({ lang, perSection });
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const fingerprint = [
        lang,
        perSection,
        media,
        ...sections.flatMap((section) => [
          section.category,
          section.total,
          ...section.items.map(freshnessKey),
        ]),
      ].join("|");
      return sendCached(request, reply, fingerprint, {
        sections: sections.map((section) => ({
          category: section.category,
          total: section.total,
          items: section.items.flatMap((article) => toSummary(article, lang, media) ?? []),
        })),
      });
    },
  );

  app.get(
    "/news/:id",
    {
      schema: {
        tags: ["news"],
        summary: "One article in the requested language",
        params: z.object({ id: z.uuid() }),
        querystring: z.object({ lang: langSchema.default("fr") }),
        response: { 200: newsDetailSchema, 304: z.null(), 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const article = await articles.get(request.params.id);
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const detail = article === null ? null : toDetail(article, request.query.lang, media);
      if (article === null || detail === null) {
        return reply.code(404).send({
          code: NOT_FOUND,
          message: "This article does not exist in this language",
          requestId: request.id,
        });
      }
      return sendCached(
        request,
        reply,
        `${request.query.lang}|${media}|${freshnessKey(article)}`,
        detail,
      );
    },
  );
  return Promise.resolve();
};
