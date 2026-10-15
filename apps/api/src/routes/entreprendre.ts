import type { JsonDocument } from "@bgs/content-store";
import {
  apiErrorSchema,
  EMPTY_ENTREPRENDRE,
  ENTREPRENDRE_PAGES,
  entreprendreDetailSchema,
  entreprendreDocumentSchema,
  entreprendreOverviewSchema,
  entreprendreSlugSchema,
  type EntreprendreDocument,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { excerptOf, htmlToBlocks } from "../news/html-to-blocks";

export interface EntreprendreRoutesOptions {
  /** The "Entreprendre" space, written by the collection from der.sn (DER-01). */
  entreprendre: JsonDocument;
}

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const EXCERPT_LENGTH = 160;

async function readSpace(document: JsonDocument): Promise<EntreprendreDocument> {
  const parsed = entreprendreDocumentSchema.safeParse(await document.read());
  return parsed.success ? parsed.data : EMPTY_ENTREPRENDRE;
}

/** The order of ENTREPRENDRE_PAGES: the groups as the space shows them. */
const rank = (slug: string) => ENTREPRENDRE_PAGES.findIndex((page) => page.slug === slug);

/**
 * Entreprendre (DER-01): the DER/FJ's offer as der.sn publishes it, page by page,
 * with its latest news. Read-only, the same for everyone: cached like the news.
 */
export const entreprendreRoutes: FastifyPluginAsyncZod<EntreprendreRoutesOptions> = (
  app,
  { entreprendre },
) => {
  app.get(
    "/entreprendre",
    {
      schema: {
        tags: ["entreprendre"],
        summary: "The pages of the DER/FJ's offer, by group, and its latest news",
        response: { 200: entreprendreOverviewSchema },
      },
    },
    async (_request, reply) => {
      const space = await readSpace(entreprendre);
      void reply.header("cache-control", CACHE_CONTROL);
      return {
        pages: [...space.pages]
          .sort((a, b) => rank(a.slug) - rank(b.slug))
          .map((page) => ({
            slug: page.slug,
            group: page.group,
            title: page.title,
            excerpt: excerptOf(htmlToBlocks(page.bodyHtml), EXCERPT_LENGTH),
            sourceUrl: page.sourceUrl,
          })),
        news: space.news,
      };
    },
  );

  app.get(
    "/entreprendre/:slug",
    {
      schema: {
        tags: ["entreprendre"],
        summary: "One page of the DER/FJ's offer, as structured blocks",
        params: z.object({ slug: entreprendreSlugSchema }),
        response: { 200: entreprendreDetailSchema, 404: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const page = (await readSpace(entreprendre)).pages.find(
        (item) => item.slug === request.params.slug,
      );
      if (page === undefined) {
        return reply.code(404).send({
          code: "ENTREPRENDRE_NOT_FOUND",
          message: "This page has not been collected yet",
          requestId: request.id,
        });
      }
      void reply.header("cache-control", CACHE_CONTROL);
      return {
        slug: page.slug,
        group: page.group,
        title: page.title,
        sourceUrl: page.sourceUrl,
        fetchedAt: page.fetchedAt,
        blocks: htmlToBlocks(page.bodyHtml),
      };
    },
  );
  return Promise.resolve();
};
