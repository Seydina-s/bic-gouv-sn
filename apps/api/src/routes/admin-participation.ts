import {
  apiErrorSchema,
  participationEntrySchema,
  participationResponseSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import { ParticipationRuleError, type ParticipationService } from "../participation/participation";
import { authorize } from "./admin-guard";

export interface AdminParticipationOptions {
  signIn: AdminSignIn;
  participation: ParticipationService;
}

const idParams = z.object({ id: z.uuid() });

/**
 * Participer in the console: everyone reads the messages and reports (photos
 * included, never cached); an editor marks one as handled, in the audit journal.
 */
export const adminParticipationRoutes: FastifyPluginAsyncZod<AdminParticipationOptions> = (
  app,
  { signIn, participation },
) => {
  app.get(
    "/participation",
    {
      schema: {
        tags: ["admin"],
        summary: "Messages and reports received, newest first",
        response: { 200: participationResponseSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return { entries: await participation.list() };
    },
  );

  app.get(
    "/participation/photos/:id",
    {
      schema: {
        tags: ["admin"],
        summary: "The photo of a report (JPEG, its hidden data removed)",
        params: idParams,
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      const photo = await participation.photo(request.params.id);
      if (photo === null) {
        return reply.code(404).send({
          code: "PARTICIPATION_NOT_FOUND",
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

  app.post(
    "/participation/:id/handled",
    {
      schema: {
        tags: ["admin"],
        summary: "Mark a message or report as handled",
        params: idParams,
        response: {
          200: participationEntrySchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "participation.handle");
      if (account === null) {
        return reply;
      }
      try {
        return await participation.markHandled(
          { id: account.id, name: account.name },
          request.params.id,
        );
      } catch (error) {
        if (!(error instanceof ParticipationRuleError)) {
          throw error;
        }
        return reply
          .code(404)
          .send({ code: error.code, message: error.code, requestId: request.id });
      }
    },
  );
  return Promise.resolve();
};
