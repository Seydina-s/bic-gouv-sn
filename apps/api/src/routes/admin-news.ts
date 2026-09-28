import type { ArticleRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  withdrawnArticlesResponseSchema,
  withdrawnVersions,
  type NewsArticle,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import { authorize } from "./admin-guard";

export interface AdminNewsOptions {
  signIn: AdminSignIn;
  articles: ArticleRepository;
}

const PAGE_SIZE = 200;

async function everyStoredArticle(articles: ArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ limit: PAGE_SIZE, cursor, includeWithdrawn: true });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

/**
 * Articles hidden because the source withdrew them, for traceability in the console
 * (every console role reads it). Read-only: the collection marks and clears them.
 */
export const adminNewsRoutes: FastifyPluginAsyncZod<AdminNewsOptions> = (
  app,
  { signIn, articles },
) => {
  app.get(
    "/news/withdrawn",
    {
      schema: {
        tags: ["admin"],
        summary: "Article versions hidden because the source withdrew them",
        response: {
          200: withdrawnArticlesResponseSchema,
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
      return { articles: withdrawnVersions(await everyStoredArticle(articles)) };
    },
  );
  return Promise.resolve();
};
