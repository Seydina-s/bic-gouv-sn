import { opportunitiesResponseSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { OpportunityService } from "../opportunities/opportunities";

export interface OpportunitiesOptions {
  opportunities: OpportunityService;
}

/** Fresh enough for a list that changes a few times a day; served stale if need be. */
const CACHE = "public, max-age=60, stale-while-revalidate=600";

/** The opportunities published and still open, for the app's front page and list. */
export const opportunitiesRoutes: FastifyPluginAsyncZod<OpportunitiesOptions> = (
  app,
  { opportunities },
) => {
  app.get(
    "/opportunities",
    {
      schema: {
        tags: ["opportunities"],
        summary: "Opportunities published by the team from official portals, still open",
        response: { 200: opportunitiesResponseSchema },
      },
    },
    async (_request, reply) => {
      void reply.header("cache-control", CACHE);
      return { opportunities: await opportunities.published() };
    },
  );
  return Promise.resolve();
};
