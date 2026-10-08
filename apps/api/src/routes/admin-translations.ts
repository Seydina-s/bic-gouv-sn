import {
  apiErrorSchema,
  translationDecisionSchema,
  translationReviewDetailSchema,
  translationsToReviewSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import { TranslationReviewError, type TranslationReview } from "../news/translation-review";
import { authorize } from "./admin-guard";

export interface AdminTranslationsOptions {
  signIn: AdminSignIn;
  review: TranslationReview;
}

const params = z.object({ id: z.uuid() });

/** A review error as the console reads it; anything else is unexpected. */
function refusal(error: unknown) {
  if (!(error instanceof TranslationReviewError)) {
    throw error;
  }
  return {
    status: error.code === "TRANSLATION_NOT_FOUND" ? (404 as const) : (409 as const),
    code: error.code,
  };
}

/** The machine translations into Wolof waiting for a person (every console role). */
export const adminTranslationsRoutes: FastifyPluginAsyncZod<AdminTranslationsOptions> = (
  app,
  { signIn, review },
) => {
  app.get(
    "/translations",
    {
      schema: {
        tags: ["admin"],
        summary: "Machine translations into Wolof waiting for a review, newest first",
        response: { 200: translationsToReviewSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "translations.review")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return { translations: await review.pending() };
    },
  );

  app.get(
    "/translations/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "The French and the machine Wolof of one article, side by side",
        params,
        response: {
          200: translationReviewDetailSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
          409: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "translations.review")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      try {
        return await review.detail(request.params.id);
      } catch (error) {
        const { status, code } = refusal(error);
        return reply.code(status).send({ code, message: code, requestId: request.id });
      }
    },
  );

  app.post(
    "/translations/:id/decision",
    {
      schema: {
        tags: ["admin"],
        summary: "Validate a machine translation, or set it aside (journaled)",
        params,
        body: translationDecisionSchema,
        response: {
          200: z.object({ saved: z.literal(true) }),
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
          409: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "translations.review");
      if (account === null) {
        return reply;
      }
      try {
        await review.decide(request.params.id, request.body, account.id);
        return { saved: true as const };
      } catch (error) {
        const { status, code } = refusal(error);
        return reply.code(status).send({ code, message: code, requestId: request.id });
      }
    },
  );
  return Promise.resolve();
};
