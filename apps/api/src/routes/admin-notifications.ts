import {
  apiErrorSchema,
  notificationSchema,
  notificationsResponseSchema,
  prepareNotificationSchema,
} from "@bgs/shared-types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn, SignedInAccount } from "../admin/sign-in-service";
import {
  NotificationRuleError,
  type NotificationService,
  type Person,
} from "../notifications/notifications";
import { authorize } from "./admin-guard";

export interface AdminNotificationsOptions {
  signIn: AdminSignIn;
  notifications: NotificationService;
}

/** How each broken rule is answered. */
const STATUS_OF: Record<string, number> = {
  NOTIFICATION_NOT_FOUND: 404,
  NOTIFICATION_NOT_PENDING: 409,
  NOTIFICATION_SAME_PERSON: 403,
  NOTIFICATION_ARTICLE_UNKNOWN: 422,
};

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
 * approves (then it is handed to the push service); either cancels.
 */
export const adminNotificationsRoutes: FastifyPluginAsyncZod<AdminNotificationsOptions> = (
  app,
  { signIn, notifications },
) => {
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
      return { notifications: await notifications.list(), canSend: notifications.canSend };
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
