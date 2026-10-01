import {
  apiErrorSchema,
  messageSubmissionSchema,
  reportSubmissionSchema,
  submissionReceiptSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ParticipationRuleError, type ParticipationService } from "../participation/participation";

export interface ParticipationOptions {
  participation: ParticipationService;
  /** False while Participer is switched off in the console (remote control). */
  isOpen: () => Promise<boolean>;
}

/** Per address and per hour: room for a person, not for a flood. */
const SUBMISSION_RATE = { max: 5, timeWindow: "1 hour" } as const;
/** A report may carry a photo (6 MB once decoded, a third more as base64). */
const REPORT_BODY_LIMIT = 9 * 1024 * 1024;

/**
 * Participer: a message to the government, or a public problem reported with a
 * photo. Anonymous: nothing about the sender is kept, the photo's hidden data is
 * removed. Read by the team in the console.
 */
export const participationRoutes: FastifyPluginAsyncZod<ParticipationOptions> = (
  app,
  { participation, isOpen },
) => {
  // Switched off in the console: the apps hide the tab, and the API refuses too.
  app.addHook("preHandler", async (request, reply) => {
    if (!(await isOpen())) {
      return reply.code(503).send({
        code: "PARTICIPATION_CLOSED",
        message: "Participer is switched off",
        requestId: request.id,
      });
    }
    return undefined;
  });
  app.post(
    "/participation/messages",
    {
      config: { rateLimit: SUBMISSION_RATE },
      schema: {
        tags: ["participation"],
        summary: "Send a message to the government (anonymous)",
        body: messageSubmissionSchema,
        response: { 201: submissionReceiptSchema, 503: apiErrorSchema },
      },
    },
    async (request, reply) => {
      const entry = await participation.receiveMessage(request.body);
      return reply.code(201).send({ id: entry.id });
    },
  );

  app.post(
    "/participation/reports",
    {
      bodyLimit: REPORT_BODY_LIMIT,
      config: { rateLimit: SUBMISSION_RATE },
      schema: {
        tags: ["participation"],
        summary: "Report a public problem, with a photo if wished (anonymous)",
        body: reportSubmissionSchema,
        response: { 201: submissionReceiptSchema, 422: apiErrorSchema, 503: apiErrorSchema },
      },
    },
    async (request, reply) => {
      try {
        const entry = await participation.receiveReport(request.body);
        return await reply.code(201).send({ id: entry.id });
      } catch (error) {
        if (!(error instanceof ParticipationRuleError)) {
          throw error;
        }
        return reply
          .code(422)
          .send({ code: error.code, message: error.code, requestId: request.id });
      }
    },
  );
  return Promise.resolve();
};
