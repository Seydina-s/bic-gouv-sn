import { readIngestionStatus } from "@bgs/content-store";
import { ingestionStatusSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export interface StatusRoutesOptions {
  /** Report written by the collection after each pass. */
  ingestionStatusPath: string;
}

/**
 * Read-only service status for the administration console: times and error codes,
 * no content and no personal data. Never cached, it must show the live state.
 */
export const statusRoutes: FastifyPluginAsyncZod<StatusRoutesOptions> = (
  app,
  { ingestionStatusPath },
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
      return { report: await readIngestionStatus(ingestionStatusPath) };
    },
  );
  return Promise.resolve();
};
