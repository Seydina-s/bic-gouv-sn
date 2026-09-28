import { apiErrorSchema, errorJournalEntrySchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { ErrorJournal } from "../journal/error-journal";
import { authorize } from "./admin-guard";

export interface AdminErrorsOptions {
  signIn: AdminSignIn;
  errorJournal: ErrorJournal;
}

/**
 * The errors the API answered, grouped, for the console's error journal (every
 * console role reads it). Explanations come from the shared catalog, in the console.
 */
export const adminErrorsRoutes: FastifyPluginAsyncZod<AdminErrorsOptions> = (
  app,
  { signIn, errorJournal },
) => {
  app.get(
    "/errors",
    {
      schema: {
        tags: ["admin"],
        summary: "Errors answered by the API, grouped by code and place, latest first",
        response: {
          200: z.object({ entries: z.array(errorJournalEntrySchema) }),
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
      return { entries: errorJournal.entries() };
    },
  );
  return Promise.resolve();
};
