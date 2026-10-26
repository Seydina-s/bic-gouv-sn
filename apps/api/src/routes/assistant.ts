import {
  apiErrorSchema,
  assistantBenchSchema,
  assistantFlagSubmissionSchema,
  assistantFlagsResponseSchema,
  assistantLimitChangeSchema,
  assistantQuestionSchema,
  assistantReplySchema,
  assistantUsageSchema,
  submissionReceiptSchema,
} from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { AdminSignIn } from "../admin/sign-in-service";
import type { AnswerFlags } from "../assistant/answer-flags";
import type { AssistantProblem, AssistantService } from "../assistant/assistant-service";
import { readBenchResults, readFlagRechecks } from "../assistant/bench-results";
import { recheckChanged } from "../assistant/flag-recheck";
import type { ErrorJournal } from "../journal/error-journal";
import { authorize } from "./admin-guard";

export interface AssistantRoutesOptions {
  assistant: AssistantService;
  /** « Signaler cette réponse »: the answers people flagged (AST-30e). */
  flags: AnswerFlags;
  /** False while the assistant is switched off in the console (remote control). */
  isOpen: () => Promise<boolean>;
  /** Failures and refusals are counted there, for the console's error journal. */
  errorJournal: ErrorJournal | null;
}

/** Per address and per hour: room for a person's questions, not for a script. */
const QUESTION_RATE = { max: 20, timeWindow: "1 hour" } as const;
/** Per address and per hour: a person flags a few answers, not hundreds. */
const FLAG_RATE = { max: 10, timeWindow: "1 hour" } as const;
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
  { assistant, flags, isOpen, errorJournal },
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
      const { reply: answer, problem, failure } = await assistant.answer(request.body);
      if (problem !== null) {
        errorJournal?.record(PROBLEM_CODES[problem], ROUTE, request.id);
      }
      if (failure !== undefined) {
        // Why the model did not answer (deadline, key refused, credit…): never the question.
        request.log.warn({ err: failure }, "Assistant model call failed");
      }
      void reply.header("cache-control", "no-store");
      return answer;
    },
  );

  // Only what the person chose to send: the question, the answer and its sources.
  app.post(
    "/assistant/flags",
    {
      config: { rateLimit: FLAG_RATE },
      schema: {
        tags: ["assistant"],
        summary: "Flag an answer of the assistant (« Signaler cette réponse », anonymous)",
        body: assistantFlagSubmissionSchema,
        response: { 201: submissionReceiptSchema, 503: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if (!(await isOpen())) {
        return reply.code(503).send({
          code: "ASSISTANT_OFF",
          message: "The assistant is switched off",
          requestId: request.id,
        });
      }
      const flag = await flags.receive(request.body);
      return reply.code(201).send({ id: flag.id });
    },
  );
  return Promise.resolve();
};

export interface AdminAssistantOptions {
  signIn: AdminSignIn;
  assistant: AssistantService;
  flags: AnswerFlags;
  /** Where the weekly test bench keeps its runs (assistant-bench.ts). */
  benchFolder: string;
}

/** The console: this month's questions and cost, and the monthly limit (admins). */
export const adminAssistantRoutes: FastifyPluginAsyncZod<AdminAssistantOptions> = (
  app,
  { signIn, assistant, flags, benchFolder },
) => {
  app.get(
    "/assistant/flags",
    {
      schema: {
        tags: ["admin"],
        summary:
          "Answers people flagged, newest first (kept 90 days), each with the bench's latest recheck",
        response: { 200: assistantFlagsResponseSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      const [kept, rechecks] = await Promise.all([flags.list(), readFlagRechecks(benchFolder)]);
      return {
        flags: kept.map((flag) => {
          const recheck = rechecks[flag.id];
          return {
            ...flag,
            recheck:
              recheck === undefined ? null : { ...recheck, changed: recheckChanged(flag, recheck) },
          };
        }),
      };
    },
  );

  app.get(
    "/assistant/bench",
    {
      schema: {
        tags: ["admin"],
        summary: "The assistant's weekly test bench: latest run, trend, known weaknesses",
        response: { 200: assistantBenchSchema, 401: apiErrorSchema, 403: apiErrorSchema },
      },
    },
    async (request, reply) => {
      if ((await authorize(request, reply, signIn, "console.read")) === null) {
        return reply;
      }
      void reply.header("cache-control", "no-store");
      return readBenchResults(benchFolder);
    },
  );

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
