import { createHash } from "node:crypto";
import type { FileProcedureThemeStore, ProcedureRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
  procedureThemesResponseSchema,
  type ErrorCode,
  type Procedure,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SearchMisses } from "../journal/search-misses";
import { toProcedureDetail, toProcedureSummary } from "../procedures/present";
import { PreparedTexts, searchTerms } from "../search/text-search";

export interface ProceduresRoutesOptions {
  procedures: ProcedureRepository;
  /** Official themes and the theme of each procedure (only validated ones are public). */
  themes: FileProcedureThemeStore;
  /** Counts searches that found nothing, for the console; none in tests by default. */
  searchMisses?: SearchMisses | null;
}

/** Procedures change rarely: longer freshness than the news, same stale window. */
const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const NOT_FOUND: ErrorCode = "PROCEDURE_NOT_FOUND";

function fingerprint(parts: readonly string[]): string {
  return `"${createHash("sha256").update(parts.join("|")).digest("base64url").slice(0, 27)}"`;
}

/** Procedures made ready for searching once per version, not at every search. */
const prepared = new PreparedTexts();

/** Matching procedures: all when no query, else best matches first (title, summary, text). */
function matching(all: readonly Procedure[], query: string | undefined): Procedure[] {
  const terms = searchTerms(query ?? "");
  if (terms.length === 0) {
    return [...all];
  }
  return prepared.rank(all, terms, (procedure) => {
    const fr = procedure.translations.find((t) => t.lang === "fr");
    return {
      key: `${procedure.id}:${procedure.contentHash}`,
      title: fr?.title ?? "",
      body: () => `${procedure.summary ?? ""} ${fr?.bodyHtml ?? ""}`,
    };
  });
}

/**
 * Administrative procedures from e-senegal.sn: we explain and link to the official
 * portal, we never perform the procedure (CLAUDE.md §1).
 */
export const proceduresRoutes: FastifyPluginAsyncZod<ProceduresRoutesOptions> = (
  app,
  { procedures, themes, searchMisses = null },
) => {
  /** Slugs a person has filed under each theme (proposals are never public). */
  async function validatedByTheme(): Promise<Map<string, Set<string>>> {
    const { assignments } = await themes.read();
    const byTheme = new Map<string, Set<string>>();
    for (const [slug, assignment] of Object.entries(assignments)) {
      if (assignment.status === "validated") {
        const slugs = byTheme.get(assignment.themeId) ?? new Set<string>();
        slugs.add(slug);
        byTheme.set(assignment.themeId, slugs);
      }
    }
    return byTheme;
  }

  app.get(
    "/procedures/themes",
    {
      schema: {
        tags: ["procedures"],
        summary: "Official themes of e-senegal.sn, with their validated procedures count",
        response: { 200: procedureThemesResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const file = await themes.read();
      const byTheme = await validatedByTheme();
      const body = {
        themes: file.themes.map((theme) => ({
          id: theme.id,
          title: theme.title,
          icon: theme.sourceIcon,
          count: byTheme.get(theme.id)?.size ?? 0,
        })),
      };
      const etag = fingerprint(body.themes.map((t) => `${t.id}:${t.title}:${String(t.count)}`));
      void reply.header("etag", etag).header("cache-control", CACHE_CONTROL);
      if (request.headers["if-none-match"] === etag) {
        return reply.code(304).send(null);
      }
      return body;
    },
  );

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
          /** Numbered page, from 1 (ignored when a cursor is given). */
          page: z.coerce.number().int().min(1).max(10_000).optional(),
          /** Only the procedures a person has filed under this official theme. */
          theme: z
            .string()
            .regex(/^[a-z0-9]+$/)
            .max(64)
            .optional(),
        }),
        response: { 200: procedureListResponseSchema, 304: z.null() },
      },
    },
    async (request, reply) => {
      const { q, limit, cursor, page: pageNumber, theme } = request.query;
      const inTheme =
        theme === undefined ? null : ((await validatedByTheme()).get(theme) ?? new Set());
      const all = matching(await procedures.all(), q).filter(
        (procedure) => inTheme === null || inTheme.has(procedure.slug),
      );
      // A search that finds nothing, once (first page, all themes): counted for the console.
      if (
        q !== undefined &&
        q.length >= 2 &&
        all.length === 0 &&
        theme === undefined &&
        cursor === undefined
      ) {
        searchMisses?.record("procedures", "fr", q);
      }
      const start =
        cursor !== undefined
          ? all.findIndex((p) => p.slug === cursor) + 1
          : ((pageNumber ?? 1) - 1) * limit;
      const page = all.slice(start, start + limit);
      const last = page.at(-1);
      const etag = fingerprint([
        q ?? "",
        cursor ?? "",
        String(start),
        theme ?? "",
        String(all.length),
        ...page.map((p) => p.contentHash),
      ]);
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
