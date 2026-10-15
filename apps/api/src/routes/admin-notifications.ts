import {
  apiErrorSchema,
  automaticNotificationsSchema,
  notificationSchema,
  notificationsResponseSchema,
  prepareMessageNotificationSchema,
  prepareNotificationSchema,
  setAutomaticNotificationsSchema,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn, SignedInAccount } from "../admin/sign-in-service";
import type { AutomaticNotifier } from "../notifications/automatic-notifier";
import { cachedSummary, type PushSubscriptionStore } from "../notifications/push-subscriptions";
import {
  NotificationRuleError,
  type NotificationService,
  type Person,
} from "../notifications/notifications";
import { authorize } from "./admin-guard";

export interface AdminNotificationsOptions {
  signIn: AdminSignIn;
  notifications: NotificationService;
  automatic: AutomaticNotifier;
  subscriptions: PushSubscriptionStore;
}

/** How each broken rule is answered. */
const STATUS_OF: Record<string, number> = {
  NOTIFICATION_NOT_FOUND: 404,
  NOTIFICATION_NOT_PENDING: 409,
  NOTIFICATION_ALREADY_PENDING: 409,
  NOTIFICATION_SAME_PERSON: 403,
  NOTIFICATION_ARTICLE_UNKNOWN: 422,
  NOTIFICATION_PHOTO_INVALID: 422,
};

/** A message may carry a photo (6 MB once decoded, a third more as base64). */
const MESSAGE_BODY_LIMIT = 9 * 1024 * 1024;

async function refuse(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (!(error instanceof NotificationRuleError)) {
    throw error;
  }
  return reply
    .code(STATUS_OF[error.code] ?? 400)
    .send({ code: error.code, message: error.code, requestId: request.id });
}

/** Who acted, as kept with the notification: an id and a name, no e-mail address. */
function personOf(account: SignedInAccount): Person {
  return { id: account.id, name: account.name };
}

const errors = {
  401: apiErrorSchema,
  403: apiErrorSchema,
  404: apiErrorSchema,
  409: apiErrorSchema,
};

/**
 * Notifications in the console: everyone reads; an editor prepares; another editor
 * approves (then it is handed to the push service); either cancels. New articles
 * are announced automatically: any editor may pause that at once, only an
 * administrator resumes it.
 */
export const adminNotificationsRoutes: FastifyPluginAsyncZod<AdminNotificationsOptions> = (
  app,
  { signIn, notifications, automatic, subscriptions },
) => {
  const subscribersSummary = cachedSummary(subscriptions);
  app.get(
    "/notifications",
    {
      schema: {
        tags: ["admin"],
        summary: "Notifications prepared, approved or cancelled, latest first",
        response: { 200: notificationsResponseSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return {
        notifications: await notifications.list(),
        canSend: notifications.canSend,
        automatic: await automatic.state(),
        subscribers: await subscribersSummary(),
      };
    },
  );

  app.put(
    "/notifications/automatic",
    {
      schema: {
        tags: ["admin"],
        summary: "Pause (any editor) or resume (an administrator) the automatic notifications",
        body: setAutomaticNotificationsSchema,
        response: { 200: automaticNotificationsSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const permission = request.body.paused ? "notifications.send" : "flags.manage";
      const account = await authorize(request, reply, signIn, permission);
      if (account === null) {
        return reply;
      }
      return automatic.setPaused(personOf(account), request.body.paused);
    },
  );

  app.post(
    "/notifications",
    {
      schema: {
        tags: ["admin"],
        summary: "Prepare a notification announcing an official article",
        body: prepareNotificationSchema,
        response: { 201: notificationSchema, 422: apiErrorSchema, ...errors },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "notifications.send");
      if (account === null) {
        return reply;
      }
      try {
        const prepared = await notifications.prepare(
          personOf(account),
          request.body.articleId,
          request.body.lang,
        );
        return await reply.code(201).send(prepared);
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  app.post(
    "/notifications/message",
    {
      bodyLimit: MESSAGE_BODY_LIMIT,
      schema: {
        tags: ["admin"],
        summary: "Prepare a message written in the console, with an optional photo",
        body: prepareMessageNotificationSchema,
        response: { 201: notificationSchema, 422: apiErrorSchema, ...errors },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "notifications.send");
      if (account === null) {
        return reply;
      }
      try {
        const prepared = await notifications.prepareMessage(personOf(account), request.body);
        return await reply.code(201).send(prepared);
      } catch (error) {
        return refuse(request, reply, error);
      }
    },
  );

  app.get(
    "/notifications/:id/photo",
    {
      schema: {
        tags: ["admin"],
        summary: "The photo of a written message (JPEG, its hidden data removed)",
        params: z.object({ id: z.uuid() }),
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      const photo = await notifications.photo(request.params.id);
      if (photo === null) {
        return reply.code(404).send({
          code: "NOTIFICATION_NOT_FOUND",
          message: "No such photo",
          requestId: request.id,
        });
      }
      return reply
        .header("content-type", "image/jpeg")
        .header("cache-control", "no-store")
        .send(photo);
    },
  );

  for (const decision of ["approve", "cancel"] as const) {
    app.post(
      `/notifications/:id/${decision}`,
      {
        schema: {
          tags: ["admin"],
          summary:
            decision === "approve"
              ? "A second person approves a notification, which is then sent"
              : "Cancel a notification that is not decided yet",
          params: z.object({ id: z.uuid() }),
          response: { 200: notificationSchema, ...errors },
        },
      },
      async (request, reply) => {
        const account = await authorize(request, reply, signIn, "notifications.send");
        if (account === null) {
          return reply;
        }
        try {
          return await (decision === "approve"
            ? notifications.approve(personOf(account), request.params.id)
            : notifications.cancel(personOf(account), request.params.id));
        } catch (error) {
          return refuse(request, reply, error);
        }
      },
    );
  }
  return Promise.resolve();
};
