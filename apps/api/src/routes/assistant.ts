import {
  apiErrorSchema,
  assistantLimitChangeSchema,
  assistantQuestionSchema,
  assistantReplySchema,
  assistantUsageSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { AssistantProblem, AssistantService } from "../assistant/assistant-service";
import type { ErrorJournal } from "../journal/error-journal";
import { authorize } from "./admin-guard";

export interface AssistantRoutesOptions {
  assistant: AssistantService;
  /** False while the assistant is switched off in the console (remote control). */
  isOpen: () => Promise<boolean>;
  /** Failures and refusals are counted there, for the console's error journal. */
  errorJournal: ErrorJournal | null;
}

/** Per address and per hour: room for a person's questions, not for a script. */
const QUESTION_RATE = { max: 20, timeWindow: "1 hour" } as const;
const ROUTE = "POST /v1/assistant/answers";

const PROBLEM_CODES: Record<Exclude<AssistantProblem, null>, string> = {
  model_failed: "ASSISTANT_MODEL_FAILED",
  answer_rejected: "ASSISTANT_ANSWER_REJECTED",
  quota_reached: "ASSISTANT_LIMIT_REACHED",
};

/**
 * The assistant and « Est-ce vrai ? »: answers drawn from the official base only,
 * with their sources. Anonymous: the question is neither logged nor kept.
 */
export const assistantRoutes: FastifyPluginAsyncZod<AssistantRoutesOptions> = (
  app,
  { assistant, isOpen, errorJournal },
) => {
  app.post(
    "/assistant/answers",
    {
      config: { rateLimit: QUESTION_RATE },
      schema: {
        tags: ["assistant"],
        summary: "Ask the assistant, or check a claim (« Est-ce vrai ? »)",
        body: assistantQuestionSchema,
        response: { 200: assistantReplySchema, 503: apiErrorSchema },
      },
    },
    async (request, reply) => {
      // Switched off in the console: the apps hide the tab, and the API refuses too.
      if (!(await isOpen())) {
        return reply.code(503).send({
          code: "ASSISTANT_OFF",
          message: "The assistant is switched off",
          requestId: request.id,
        });
      }
      const { reply: answer, problem } = await assistant.answer(request.body);
      if (problem !== null) {
        errorJournal?.record(PROBLEM_CODES[problem], ROUTE, request.id);
      }
      void reply.header("cache-control", "no-store");
      return answer;
    },
  );
  return Promise.resolve();
};

export interface AdminAssistantOptions {
  signIn: AdminSignIn;
  assistant: AssistantService;
}

/** The console: this month's questions and cost, and the monthly limit (admins). */
export const adminAssistantRoutes: FastifyPluginAsyncZod<AdminAssistantOptions> = (
  app,
  { signIn, assistant },
) => {
  app.get(
    "/assistant",
    {
      schema: {
        tags: ["admin"],
        summary: "This month's questions to the assistant, its cost and limit",
        response: { 200: assistantUsageSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return assistant.usage();
    },
  );

  app.put(
    "/assistant/limit",
    {
      schema: {
        tags: ["admin"],
        summary: "An admin changes the monthly limit of questions (journaled)",
        body: assistantLimitChangeSchema,
        response: {
          200: assistantUsageSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const account = await authorize(request, reply, signIn, "flags.manage");
      if (account === null) {
        return reply;
      }
      return assistant.setMonthlyLimit(request.body.monthlyLimit, account.id);
    },
  );
  return Promise.resolve();
};
