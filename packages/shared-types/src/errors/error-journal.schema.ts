import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/*
 * The error journal of the console (CLAUDE.md §4.5): identical errors grouped by
 * code and place, with how often and since when. No address, no personal data: a
 * route pattern ("GET /v1/news/:id") and the identifier of the last request, to
 * find it in the technical logs.
 */

export const errorJournalEntrySchema = z.object({
  code: z.string().min(1).max(64),
  /** Where it happens: a route pattern, or a service ("Collecte automatique"). */
  where: z.string().min(1).max(200),
  count: z.int().positive(),
  firstAt: isoDateTimeSchema,
  lastAt: isoDateTimeSchema,
  lastRequestId: z.string().max(100).nullable(),
});
export type ErrorJournalEntry = z.infer<typeof errorJournalEntrySchema>;

export const errorJournalFileSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(errorJournalEntrySchema),
});
export type ErrorJournalFile = z.infer<typeof errorJournalFileSchema>;

/** Seen within this time: the error is still happening. */
export const ONGOING_WINDOW_MS = 15 * 60 * 1000;

export function isOngoing(entry: Pick<ErrorJournalEntry, "lastAt">, now: Date): boolean {
  return now.getTime() - Date.parse(entry.lastAt) <= ONGOING_WINDOW_MS;
}
