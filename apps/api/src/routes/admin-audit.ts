import { firstBrokenEntry } from "@bgs/admin-auth";
import { apiErrorSchema, auditResponseSchema, type AuditEntryView } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AdminAccountStore } from "../admin/account-store";
import type { AuditJournal } from "../admin/audit-journal";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

export interface AdminAuditOptions {
  signIn: AdminSignIn;
  journal: AuditJournal;
  accounts?: AdminAccountStore | undefined;
}

/** Latest entries shown: enough for a day of activity, light to send. */
const SHOWN = 200;

/**
 * The audit journal for administrators: the latest actions, with names, and a
 * check of the whole chain (an entry changed or removed afterwards is revealed).
 */
export const adminAuditRoutes: FastifyPluginAsyncZod<AdminAuditOptions> = (
  app,
  { signIn, journal, accounts },
) => {
  app.get(
    "/audit",
    {
      schema: {
        tags: ["admin"],
        summary: "Latest audit entries, with a check of the whole chain",
        response: { 200: auditResponseSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "audit.read")) === null) {
        return reply;
      }
      const all = await journal.entries();
      const broken = firstBrokenEntry(all);
      const names = new Map<string, string | null>();
      const nameOf = async (actor: string) => {
        if (!names.has(actor)) {
          names.set(actor, (await accounts?.get(actor))?.name ?? null);
        }
        return names.get(actor) ?? null;
      };
      const entries: AuditEntryView[] = [];
      for (const entry of all.slice(-SHOWN).reverse()) {
        entries.push({
          at: entry.at,
          actor: entry.actor,
          actorName: await nameOf(entry.actor),
          action: entry.action,
          target: entry.target,
          details: entry.details,
        });
      }
      void reply.header("cache-control", "no-store");
      return {
        entries,
        total: all.length,
        intact: broken === -1,
        firstBrokenAt: broken === -1 ? null : (all[broken]?.at ?? null),
      };
    },
  );
  return Promise.resolve();
};
