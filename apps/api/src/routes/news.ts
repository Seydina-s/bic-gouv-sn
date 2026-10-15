import { createHash } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  institutionSchema,
  isoDateSchema,
  langSchema,
  slugSchema,
  newsDetailSchema,
  newsListResponseSchema,
  newsPublishersResponseSchema,
  newsSectionsResponseSchema,
  type ErrorCode,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SearchMisses } from "../journal/search-misses";
import { freshnessKey, isWithdrawnIn, toDetail, toSummary } from "../news/present";
import { searchArticles } from "../news/search";
import { mediaBaseUrlFor } from "./media";

export interface NewsRoutesOptions {
  articles: ArticleRepository;
  /** Public address of media; absent in development (served by this API). */
  mediaBaseUrl: string | undefined;
  /** Counts searches that found nothing, for the console; none in tests by default. */
  searchMisses?: SearchMisses | null;
}

/**
 * Read-heavy public content: short freshness, long stale-while-revalidate so CDNs
 * and the app keep serving while a new version is fetched (CLAUDE.md §4.2).
 */
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=600";

const NOT_FOUND: ErrorCode = "NEWS_NOT_FOUND";
const WITHDRAWN: ErrorCode = "NEWS_WITHDRAWN";

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

/** A comma-separated list in a query ("a,b"). */
const commaSeparated = z
  .string()
  .transform((text) => text.split(",").filter((part) => part !== ""));
/** The "Filtrer" panel's sections and institutions (30 at most each). */
const categoriesQuery = commaSeparated.pipe(z.array(slugSchema).min(1).max(30));
const publishersQuery = commaSeparated.pipe(z.array(institutionSchema).min(1).max(30));

export const newsRoutes: FastifyPluginAsyncZod<NewsRoutesOptions> = (
  app,
  { articles, mediaBaseUrl, searchMisses = null },
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
      if (hits.length === 0) {
        searchMisses?.record("news", lang, q);
      }
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
          /** Only this institution's articles (published or also published by it). */
          publisher: institutionSchema.optional(),
          /** The "Filtrer" panel (FILT-01): sections, comma-separated. */
          categories: categoriesQuery.optional(),
          /** Institutions, comma-separated. */
          publishers: publishersQuery.optional(),
          /** Published on this day or after. */
          since: isoDateSchema.optional(),
          order: z.enum(["newest", "oldest"]).default("newest"),
          /** Also shown in this language ("available in Wolof"). */
          alsoIn: langSchema.optional(),
          audio: z.literal("true").optional(),
          documents: z.literal("true").optional(),
        }),
        response: { 200: newsListResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { lang, limit, cursor, page: pageNumber, category, publisher } = request.query;
      const { categories, publishers, since, order, alsoIn, audio, documents } = request.query;
      const offset =
        cursor === undefined && pageNumber !== undefined ? (pageNumber - 1) * limit : 0;
      const page = await articles.list({
        lang,
        limit,
        cursor,
        offset,
        category,
        publisher,
        categories,
        publishers,
        since,
        oldestFirst: order === "oldest",
        alsoIn,
        withAudio: audio === "true",
        withDocuments: documents === "true",
      });
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const items = page.items.flatMap((article) => toSummary(article, lang, media) ?? []);
      const fingerprint = [
        lang,
        cursor,
        offset,
        category,
        publisher,
        categories?.join(","),
        publishers?.join(","),
        since,
        order,
        alsoIn,
        audio,
        documents,
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
    "/news/publishers",
    {
      schema: {
        tags: ["news"],
        summary: "How many articles each institution has, for the list of institutions",
        querystring: z.object({ lang: langSchema.default("fr") }),
        response: { 200: newsPublishersResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const publishers = await articles.publishers(request.query.lang);
      const fingerprint = [
        request.query.lang,
        ...publishers.map(
          (count) => `${count.publisher}:${String(count.total)}:${count.lastFetchedAt}`,
        ),
      ].join("|");
      return sendCached(request, reply, fingerprint, { publishers });
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
        response: {
          200: newsDetailSchema,
          304: z.null(),
          404: apiErrorSchema,
          410: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const stored = await articles.get(request.params.id);
      // A repeat of the Présidence's article (shared link, older notification): the
      // reader gets the version kept, under its own id.
      const article =
        stored?.duplicateOf === undefined
          ? stored
          : ((await articles.get(stored.duplicateOf)) ?? stored);
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const detail = article === null ? null : toDetail(article, request.query.lang, media);
      if (article !== null && isWithdrawnIn(article, request.query.lang)) {
        // Gone for good, unlike a missing article: the app drops its saved copy too.
        return reply.code(410).send({
          code: WITHDRAWN,
          message: "The source withdrew this article",
          requestId: request.id,
        });
      }
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
