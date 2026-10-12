import { readIngestionStatus, readSitesReview, type JsonDocument } from "@bgs/content-store";
import { ingestionStatusSchema, sitesReviewSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export interface StatusRoutesOptions {
  /** Report written by the collection after each pass. */
  ingestionStatus: JsonDocument;
  /** Weekly review of the ministry sites not collected yet (GOV-08). */
  sitesReview: JsonDocument;
}

/**
 * Read-only service status for the administration console: times and error codes,
 * no content and no personal data. Never cached, it must show the live state.
 */
export const statusRoutes: FastifyPluginAsyncZod<StatusRoutesOptions> = (
  app,
  { ingestionStatus, sitesReview },
) => {
  app.get(
    "/status/ingestion",
    {
      schema: {
        tags: ["status"],
        summary: "Last report of the real-time news collection",
        response: { 200: z.object({ report: ingestionStatusSchema.nullable() }) },
      },
    },
    async (_request, reply) => {
      void reply.header("cache-control", "no-store");
      return { report: await readIngestionStatus(ingestionStatus) };
    },
  );
  app.get(
    "/status/sites",
    {
      schema: {
        tags: ["status"],
        summary: "Last weekly review of the ministry sites the collection cannot read yet",
        response: { 200: z.object({ review: sitesReviewSchema.nullable() }) },
      },
    },
    async (_request, reply) => {
      void reply.header("cache-control", "no-store");
      return { review: await readSitesReview(sitesReview) };
    },
  );
  return Promise.resolve();
};
