import {
  apiErrorSchema,
  SEARCH_MISS_MIN_COUNT,
  searchMissesResponseSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { SearchMisses } from "../journal/search-misses";
import { authorize } from "./admin-guard";

export interface AdminSearchMissesOptions {
  signIn: AdminSignIn;
  searchMisses: SearchMisses;
}

/**
 * Searches people made that found nothing, to see what is missing (every console
 * role). Only searches made at least SEARCH_MISS_MIN_COUNT times ever leave the API.
 */
export const adminSearchMissesRoutes: FastifyPluginAsyncZod<AdminSearchMissesOptions> = (
  app,
  { signIn, searchMisses },
) => {
  app.get(
    "/search-misses",
    {
      schema: {
        tags: ["admin"],
        summary: "Frequent searches that found nothing, most searched first",
        response: {
          200: searchMissesResponseSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return { minCount: SEARCH_MISS_MIN_COUNT, entries: searchMisses.shown() };
    },
  );
  return Promise.resolve();
};
