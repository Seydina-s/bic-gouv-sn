import type { ArticleRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  publishedTranslation,
  usageBatchSchema,
  usageReportSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { UsageStats } from "../usage/usage-stats";
import { authorize } from "./admin-guard";

/** A phone sends a signal a day and a few reads: far below the general limit. */
const SIGNALS_RATE = { max: 30, timeWindow: "1 minute" } as const;

/**
 * The app's anonymous usage signals (ADM-12), sent only when the person turned
 * them on. Counted, then forgotten: no address, no identifier is kept, and the
 * body is never logged.
 */
export const usageSignalsRoutes: FastifyPluginAsyncZod<{ usageStats: UsageStats }> = (
  app,
  { usageStats },
) => {
  app.post(
    "/stats",
    {
      config: { rateLimit: SIGNALS_RATE },
      schema: {
        tags: ["usage"],
        summary: "Anonymous usage signals from the app (counted, nothing kept per person)",
        body: usageBatchSchema,
        response: { 204: z.null(), 400: apiErrorSchema },
      },
    },
    async (request, reply) => {
      usageStats.record(request.body.signals);
      return reply.code(204).header("cache-control", "no-store").send(null);
    },
  );
  return Promise.resolve();
};

/** The usage dashboards of the console (every role). */
export const adminUsageRoutes: FastifyPluginAsyncZod<{
  signIn: AdminSignIn;
  usageStats: UsageStats;
  articles: ArticleRepository;
}> = (app, { signIn, usageStats, articles }) => {
  app.get(
    "/usage",
    {
      schema: {
        tags: ["admin"],
        summary: "Anonymous usage counters: active people, new ones, retention, reads",
        response: { 200: usageReportSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return usageStats.report(async (articleId) => {
        const article = await articles.get(articleId);
        return article === null ? null : (publishedTranslation(article, "fr")?.title ?? null);
      });
    },
  );
  return Promise.resolve();
};
