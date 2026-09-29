import { apiErrorSchema, pushSubscriptionSchema, pushUnsubscribeSchema } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { PushSubscriptionStore } from "../notifications/push-subscriptions";

/** A phone changes its choices now and then: far below the general limit. */
const SUBSCRIPTION_RATE = { max: 10, timeWindow: "1 minute" } as const;

/**
 * The sections a phone follows, and its quiet hours (FEED-04, opt-in). Keyed by
 * the phone's push token only; never cached, never logged.
 */
export const pushSubscriptionRoutes: FastifyPluginAsyncZod<{
  subscriptions: PushSubscriptionStore;
}> = (app, { subscriptions }) => {
  app.put(
    "/push/subscription",
    {
      config: { rateLimit: SUBSCRIPTION_RATE },
      schema: {
        tags: ["push"],
        summary: "Follow sections (an empty list stops everything)",
        body: pushSubscriptionSchema,
        response: { 204: z.null(), 400: apiErrorSchema },
      },
    },
    async (request, reply) => {
      await subscriptions.save(request.body);
      return reply.code(204).header("cache-control", "no-store").send(null);
    },
  );

  app.delete(
    "/push/subscription",
    {
      config: { rateLimit: SUBSCRIPTION_RATE },
      schema: {
        tags: ["push"],
        summary: "Stop every notification to this phone",
        body: pushUnsubscribeSchema,
        response: { 204: z.null(), 400: apiErrorSchema },
      },
    },
    async (request, reply) => {
      await subscriptions.remove([request.body.token]);
      return reply.code(204).header("cache-control", "no-store").send(null);
    },
  );
  return Promise.resolve();
};
