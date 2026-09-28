import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/*
 * The console's view of the immutable audit journal (CLAUDE.md §1: "journal
 * d'audit immuable"): the latest actions and whether the chain is intact.
 */

export const auditEntryViewSchema = z.object({
  at: isoDateTimeSchema,
  /** Account id, or "system". */
  actor: z.string().min(1),
  /** The account's name when it is known (null for "system" or a removed account). */
  actorName: z.string().nullable(),
  action: z.string().min(1),
  target: z.string().nullable(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
export type AuditEntryView = z.infer<typeof auditEntryViewSchema>;

export const auditResponseSchema = z.object({
  /** Latest first. */
  entries: z.array(auditEntryViewSchema),
  /** Entries in the whole journal. */
  total: z.int().nonnegative(),
  /** False when an entry was changed or removed after being written. */
  intact: z.boolean(),
  /** Date of the first entry found altered, when the chain is broken. */
  firstBrokenAt: isoDateTimeSchema.nullable(),
});
export type AuditResponse = z.infer<typeof auditResponseSchema>;
