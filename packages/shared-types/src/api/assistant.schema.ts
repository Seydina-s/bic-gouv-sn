import { z } from "zod";
import { langSchema } from "../common/primitives.schema";

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

/** An official page the answer comes from, to open in the app or at the source. */
export const assistantSourceSchema = z.object({
  kind: z.enum(["news-article", "procedure"]),
  /** The article's id, to open it in the app. */
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

/** The console's view of this month's use and its limit. */
export const assistantUsageSchema = z.object({
  /** "2026-10" */
  month: z.string().regex(/^\d{4}-\d{2}$/),
  questions: z.int().nonnegative(),
  monthlyLimit: z.int().positive(),
  /** Read and written by the model this month: its cost. */
  inputTokens: z.int().nonnegative(),
  outputTokens: z.int().nonnegative(),
  /** A model is configured: the assistant can answer. */
  configured: z.boolean(),
});
export type AssistantUsage = z.infer<typeof assistantUsageSchema>;

export const ASSISTANT_LIMIT_MAX = 1_000_000;
export const assistantLimitChangeSchema = z.strictObject({
  monthlyLimit: z.int().min(1).max(ASSISTANT_LIMIT_MAX),
});
