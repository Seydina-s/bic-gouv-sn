import { createHash } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  langSchema,
  newsDetailSchema,
  newsListResponseSchema,
  type ErrorCode,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { freshnessKey, toDetail, toSummary } from "../news/present";
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
    "/news",
    {
      schema: {
        tags: ["news"],
        summary: "Latest official news, newest first",
        querystring: z.object({
          lang: langSchema.default("fr"),
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.uuid().optional(),
        }),
        response: { 200: newsListResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { lang, limit, cursor } = request.query;
      const page = await articles.list({ lang, limit, cursor });
      const media = mediaBaseUrlFor(request, mediaBaseUrl);
      const items = page.items.flatMap((article) => toSummary(article, lang, media) ?? []);
      const fingerprint = [lang, cursor, media, ...page.items.map(freshnessKey)].join("|");
      return sendCached(request, reply, fingerprint, { items, nextCursor: page.nextCursor });
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
