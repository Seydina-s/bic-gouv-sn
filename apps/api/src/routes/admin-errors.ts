import { apiErrorSchema, errorJournalEntrySchema, resolveErrorSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { ErrorJournal } from "../journal/error-journal";
import { authorize } from "./admin-guard";

export interface AdminErrorsOptions {
  signIn: AdminSignIn;
  errorJournal: ErrorJournal;
  journal: AuditJournal;
  now?: () => Date;
}

/**
 * The errors the API answered, grouped, for the console's error journal (every
 * console role reads it; an editor marks one as fixed, which the audit journal
 * keeps). Explanations come from the shared catalog, in the console.
 */
export const adminErrorsRoutes: FastifyPluginAsyncZod<AdminErrorsOptions> = (
  app,
  { signIn, errorJournal, journal, now = () => new Date() },
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
      return { entries: await errorJournal.entries() };
    },
  );

  app.post(
    "/errors/resolved",
    {
      schema: {
        tags: ["admin"],
        summary: "Mark an error group as fixed (it comes back if it happens again)",
        body: resolveErrorSchema,
        response: {
          204: z.null(),
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "errors.resolve");
      if (account === null) {
        return reply;
      }
      const at = now().toISOString();
      const { code, where } = request.body;
      if (!(await errorJournal.resolve({ code, where }, { at, by: account.name }))) {
        return reply.code(404).send({
          code: "ERROR_GROUP_NOT_FOUND",
          message: "No such error group",
          requestId: request.id,
        });
      }
      await journal.append({
        at,
        actor: account.id,
        action: "error.resolved",
        target: `${code} ${where}`,
        details: {},
      });
      return reply.code(204).send(null);
    },
  );
  return Promise.resolve();
};
