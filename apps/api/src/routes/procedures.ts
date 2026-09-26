import { createHash } from "node:crypto";
import type { ProcedureRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
  type ErrorCode,
  type Procedure,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { toProcedureDetail, toProcedureSummary } from "../procedures/present";
import { scoreText, searchTerms } from "../search/text-search";

export interface ProceduresRoutesOptions {
  procedures: ProcedureRepository;
}

/** Procedures change rarely: longer freshness than the news, same stale window. */
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const NOT_FOUND: ErrorCode = "PROCEDURE_NOT_FOUND";

function fingerprint(parts: readonly string[]): string {
  return `"${createHash("sha256").update(parts.join("|")).digest("base64url").slice(0, 27)}"`;
}

/** Matching procedures: all when no query, else best matches first (title, summary, text). */
function matching(all: readonly Procedure[], query: string | undefined): Procedure[] {
  const terms = searchTerms(query ?? "");
  if (terms.length === 0) {
    return [...all];
  }
  return all
    .map((procedure, rank) => {
      const fr = procedure.translations.find((t) => t.lang === "fr");
      const body = `${procedure.summary ?? ""} ${fr?.bodyHtml ?? ""}`;
      return { procedure, rank, score: scoreText(fr?.title ?? "", body, terms) };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .map((hit) => hit.procedure);
}

/**
 * Administrative procedures from e-senegal.sn: we explain and link to the official
 * portal, we never perform the procedure (CLAUDE.md §1).
 */
export const proceduresRoutes: FastifyPluginAsyncZod<ProceduresRoutesOptions> = (
  app,
  { procedures },
) => {
  app.get(
    "/procedures",
    {
      schema: {
        tags: ["procedures"],
        summary: "Administrative procedures, alphabetical or best matches for a search",
        querystring: z.object({
          q: z.string().trim().max(120).optional(),
          limit: z.coerce.number().int().min(1).max(100).default(30),
          /** Slug of the last procedure of the previous page. */
          cursor: z.string().min(1).max(200).optional(),
        }),
        response: { 200: procedureListResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { q, limit, cursor } = request.query;
      const all = matching(await procedures.all(), q);
      const start = cursor === undefined ? 0 : all.findIndex((p) => p.slug === cursor) + 1;
      const page = all.slice(start, start + limit);
      const last = page.at(-1);
      const etag = fingerprint([q ?? "", cursor ?? "", ...page.map((p) => p.contentHash)]);
      void reply.header("etag", etag).header("cache-control", CACHE_CONTROL);
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send(null);
      }
      return {
        items: page.flatMap((procedure) => toProcedureSummary(procedure) ?? []),
        nextCursor: start + limit < all.length && last !== undefined ? last.slug : null,
        total: all.length,
      };
    },
  );

  app.get(
    "/procedures/:slug",
    {
      schema: {
        tags: ["procedures"],
        summary: "One procedure: steps, documents, fee, delay, link to the official page",
        params: z.object({ slug: z.string().min(1).max(200) }),
        response: { 200: procedureDetailSchema, 304: z.null(), 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const procedure = await procedures.getBySlug(request.params.slug);
      const detail = procedure === null ? null : toProcedureDetail(procedure);
      if (procedure === null || detail === null) {
        return reply.code(404).send({
          code: NOT_FOUND,
          message: "This procedure does not exist",
          requestId: request.id,
        });
      }
      const etag = fingerprint([procedure.contentHash]);
      void reply.header("etag", etag).header("cache-control", CACHE_CONTROL);
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send(null);
      }
      return detail;
    },
  );
  return Promise.resolve();
};
