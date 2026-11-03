import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import { isoDateTimeSchema, langSchema } from "../common/primitives.schema";

/*
 * The assistant (CLAUDE.md §1, P2; owner's decision of 07/10/2026): short answers
 * drawn only from the official base, each with its sources, and « Est-ce vrai ? »,
 * which says what the official sources say about a claim. Nothing is shown without
 * a source; when the base has no answer, it says so.
 */

export const ASSISTANT_QUESTION_MIN = 3;
export const ASSISTANT_QUESTION_MAX = 300;

/** Ask a question, or check a claim (« Est-ce vrai ? »). */
export const ASSISTANT_MODES = ["ask", "verify"] as const;
export const assistantModeSchema = z.enum(ASSISTANT_MODES);
export type AssistantMode = z.infer<typeof assistantModeSchema>;

export const assistantQuestionSchema = z.strictObject({
  question: z.string().trim().min(ASSISTANT_QUESTION_MIN).max(ASSISTANT_QUESTION_MAX),
  lang: langSchema,
  mode: assistantModeSchema.default("ask"),
});
export type AssistantQuestion = z.infer<typeof assistantQuestionSchema>;

/**
 * An official page the answer comes from, to open in the app or at the source. A
 * "service" is a government office of the map, verified in the console (AST-25).
 */
export const assistantSourceSchema = z.object({
  kind: z.enum(["news-article", "procedure", "service"]),
  /** The article's or the service's id, to open it in the app. */
  contentId: z.string().min(1),
  /** The procedure's slug, to open its sheet in the app; null for an article. */
  slug: z.string().min(1).nullable(),
  title: z.string().min(1),
  url: z.url(),
  publishedOn: z.iso.date().nullable(),
});
export type AssistantSource = z.infer<typeof assistantSourceSchema>;

/**
 * - answered: an answer, with at least one official source;
 * - not_found: the official base has no answer;
 * - out_of_scope: the question is not about the government's action or procedures;
 * - paused: this month's questions are used up; back on `resumesOn`;
 * - unavailable: the assistant is not running (no model configured, or failing).
 */
export const ASSISTANT_STATUSES = [
  "answered",
  "not_found",
  "out_of_scope",
  "paused",
  "unavailable",
] as const;
export const assistantStatusSchema = z.enum(ASSISTANT_STATUSES);
export type AssistantStatus = z.infer<typeof assistantStatusSchema>;

export const assistantReplySchema = z.object({
  status: assistantStatusSchema,
  text: z.string().min(1).nullable(),
  sources: z.array(assistantSourceSchema),
  /** First day the assistant answers again (paused only). */
  resumesOn: z.iso.date().nullable(),
});
export type AssistantReply = z.infer<typeof assistantReplySchema>;

/**
 * Tolerant reader for the app: a source of a kind added later is dropped, not the
 * whole reply. An answer left with no source it can show is refused (nothing is
 * shown without its source).
 */
export function readAssistantReply(raw: unknown): AssistantReply | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const sources: unknown = Reflect.get(raw, "sources");
  const readable = Array.isArray(sources)
    ? sources.filter((source) => assistantSourceSchema.safeParse(source).success)
    : sources;
  const parsed = assistantReplySchema.safeParse({ ...raw, sources: readable });
  if (!parsed.success) {
    return null;
  }
  const lost = Array.isArray(sources) && sources.length > 0 && parsed.data.sources.length === 0;
  return parsed.data.status === "answered" && lost ? null : parsed.data;
}

/**
 * « Signaler cette réponse » (AST-30e, owner's decisions of 19 and 25/10/2026): the
 * question, the answer and its sources, sent only when the person taps the button;
 * nothing about the person. Read in the console, erased after ASSISTANT_FLAG_KEPT_DAYS.
 */
export const ASSISTANT_FLAG_KEPT_DAYS = 90;
export const ASSISTANT_ANSWER_MAX = 2000;
/** Sent by the app, shown in the console: its links must be official ones. */
const flaggedSourceSchema = assistantSourceSchema.extend({ url: officialSourceUrlSchema });
export const assistantFlagSubmissionSchema = z.strictObject({
  question: z.string().trim().min(ASSISTANT_QUESTION_MIN).max(ASSISTANT_QUESTION_MAX),
  lang: langSchema,
  mode: assistantModeSchema,
  status: z.enum(["answered", "not_found", "out_of_scope"]),
  answer: z.string().trim().min(1).max(ASSISTANT_ANSWER_MAX).nullable(),
  sources: z.array(flaggedSourceSchema).max(8),
});
export type AssistantFlagSubmission = z.infer<typeof assistantFlagSubmissionSchema>;

export const assistantFlagSchema = assistantFlagSubmissionSchema.extend({
  id: z.uuid(),
  receivedAt: isoDateTimeSchema,
});
export type AssistantFlag = z.infer<typeof assistantFlagSchema>;

/**
 * A flagged question asked again by the weekly bench (AST-30g): what the assistant
 * replies to it now, to see whether a fix holds. Its sources come from our own base.
 */
export const assistantFlagRecheckSchema = z.object({
  askedOn: z.iso.date(),
  status: assistantFlagSubmissionSchema.shape.status,
  answer: z.string().trim().min(1).max(ASSISTANT_ANSWER_MAX).nullable(),
  sources: z.array(assistantSourceSchema).max(8),
});
export type AssistantFlagRecheck = z.infer<typeof assistantFlagRecheckSchema>;

/**
 * The console's list of flagged answers, newest first, each with its latest recheck;
 * `changed`: another status or other pages than in the flagged answer.
 */
export const assistantFlagsResponseSchema = z.object({
  flags: z.array(
    assistantFlagSchema.extend({
      recheck: assistantFlagRecheckSchema.extend({ changed: z.boolean() }).nullable(),
    }),
  ),
});
export type AssistantFlagWithRecheck = z.infer<
  typeof assistantFlagsResponseSchema
>["flags"][number];

/** The console's view of this month's use and its limit. */
export const assistantUsageSchema = z.object({
  /** "2026-10" */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  questions: z.int().nonnegative(),
  monthlyLimit: z.int().positive(),
  /** Read and written by the model this month: its cost. */
  inputTokens: z.int().nonnegative(),
  outputTokens: z.int().nonnegative(),
  /**
   * What this month's calls cost, in dollars, at the price of the model that made each
   * one (two models since 11/10/2026: one per language). Absent from older APIs.
   */
  costUsd: z.number().nonnegative().optional(),
  /** A model is configured: the assistant can answer. */
  configured: z.boolean(),
});
export type AssistantUsage = z.infer<typeof assistantUsageSchema>;

export const ASSISTANT_LIMIT_MAX = 1_000_000;
export const assistantLimitChangeSchema = z.strictObject({
  monthlyLimit: z.int().min(1).max(ASSISTANT_LIMIT_MAX),
});

const benchScoreSchema = z.object({
  /** The day of the run. */
  date: z.iso.date(),
  cases: z.int().nonnegative(),
  passed: z.int().nonnegative(),
});

/**
 * The assistant's weekly test bench, for the console (AST-30f): the latest run by
 * kind of question, the trend over the runs, and the known weaknesses, each asked
 * again every week until it passes twice in a row.
 */
export const assistantBenchSchema = z.object({
  latest: benchScoreSchema
    .extend({
      /** Traps answered: the target is none. */
      invented: z.int().nonnegative(),
      costUsd: z.number().nonnegative(),
      byKind: z.array(
        z.object({
          kind: z.string().min(1),
          cases: z.int().nonnegative(),
          passed: z.int().nonnegative(),
        }),
      ),
      /** Weaknesses that passed twice in a row at this run. */
      fixed: z.int().nonnegative(),
    })
    .nullable(),
  /** The latest runs, oldest first. */
  history: z.array(benchScoreSchema),
  weaknesses: z.array(
    z.object({
      question: z.string().min(1),
      kind: z.string().min(1),
      /** The day it first failed. */
      since: z.iso.date(),
      reason: z.string(),
      passedInARow: z.int().nonnegative(),
    }),
  ),
});
export type AssistantBench = z.infer<typeof assistantBenchSchema>;
