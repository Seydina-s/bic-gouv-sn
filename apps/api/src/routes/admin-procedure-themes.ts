import type { FileProcedureThemeStore, ProcedureRepository } from "@bgs/content-store";
import { apiErrorSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

export interface AdminProcedureThemesOptions {
  signIn: AdminSignIn;
  journal: AuditJournal;
  procedures: ProcedureRepository;
  themes: FileProcedureThemeStore;
}

/** A batch stays small enough to be read by the person who validates it. */
const MAX_BATCH = 200;

const reviewSchema = z.object({
  themes: z.array(z.object({ id: z.string(), title: z.string(), icon: z.string().nullable() })),
  procedures: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
      themeId: z.string().nullable(),
      /** "unclassified": no proposal, a person picks the theme. */
      status: z.enum(["proposed", "validated", "unclassified"]),
      reviewedBy: z.string().nullable(),
      reviewedAt: z.string().nullable(),
    }),
  ),
});

/**
 * Review of the procedure themes in the console (reviewer role and above): the
 * proposals, then validation by batches. Each batch is written to the audit journal.
 */
export const adminProcedureThemesRoutes: FastifyPluginAsyncZod<AdminProcedureThemesOptions> = (
  app,
  { signIn, journal, procedures, themes },
) => {
  app.addHook("onSend", (_request, reply, payload, done) => {
    void reply.header("cache-control", "no-store");
    done(null, payload);
  });

  app.get(
    "/procedure-themes",
    {
      schema: {
        tags: ["admin"],
        summary: "Themes and the proposed or validated theme of every procedure",
        response: { 200: reviewSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "procedures.review")) === null) {
        return reply;
      }
      const file = await themes.read();
      return {
        themes: file.themes.map((theme) => ({
          id: theme.id,
          title: theme.title,
          icon: theme.sourceIcon,
        })),
        procedures: (await procedures.all()).map((procedure) => {
          const assignment = file.assignments[procedure.slug];
          return {
            slug: procedure.slug,
            title: procedure.translations.find((t) => t.lang === "fr")?.title ?? procedure.slug,
            summary: procedure.summary,
            themeId: assignment?.themeId ?? null,
            status: assignment?.status ?? ("unclassified" as const),
            reviewedBy: assignment?.reviewedBy ?? null,
            reviewedAt: assignment?.reviewedAt ?? null,
          };
        }),
      };
    },
  );

  app.post(
    "/procedure-themes/validate",
    {
      schema: {
        tags: ["admin"],
        summary: "A person confirms (or corrects) the theme of a batch of procedures",
        body: z.object({
          themeId: z
            .string()
            .regex(/^[a-z0-9]+$/)
            .max(64),
          slugs: z.array(z.string().min(1).max(200)).min(1).max(MAX_BATCH),
        }),
        response: {
          200: z.object({ validated: z.int() }),
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "procedures.review");
      if (account === null) {
        return reply;
      }
      const { themeId, slugs } = request.body;
      const file = await themes.read();
      const known = new Set((await procedures.all()).map((procedure) => procedure.slug));
      if (!file.themes.some((theme) => theme.id === themeId) || slugs.some((s) => !known.has(s))) {
        return reply.code(400).send({
          code: "REQUEST_INVALID",
          message: "Unknown theme or procedure",
          requestId: request.id,
        });
      }
      const at = new Date().toISOString();
      const before = await themes.validate(slugs, themeId, account.id, at);
      const corrected = Object.values(before).filter(
        (previous) => previous !== null && previous.themeId !== themeId,
      ).length;
      await journal.append({
        at,
        actor: account.id,
        action: "procedure.theme.validated",
        target: themeId,
        details: { count: slugs.length, corrected, slugs: slugs.join(",") },
      });
      return { validated: slugs.length };
    },
  );

  return Promise.resolve();
};
