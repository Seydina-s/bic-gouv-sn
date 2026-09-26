import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import { httpsUrlSchema, isoDateTimeSchema } from "../common/primitives.schema";
import { translationStatusSchema } from "../content/translation.schema";
import { blockSchema } from "./news.schema";

/*
 * Public procedures API (/v1/procedures). Like the news, long texts travel as
 * structured blocks rendered natively; objects are not strict (additive evolution,
 * see news.schema.ts).
 */

/** One procedure in a list: what helps choose it at a glance. */
export const procedureSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  /** Fee in CFA francs; null when the source gives none (unknown, not "free"). */
  costFcfa: z.int().nonnegative().nullable(),
  /** Processing time in days; null when the source gives none. */
  delayDays: z.int().nonnegative().nullable(),
  online: z.boolean(),
});
export type ProcedureSummary = z.infer<typeof procedureSummarySchema>;

export const procedureListResponseSchema = z.object({
  items: z.array(procedureSummarySchema),
  nextCursor: z.string().nullable(),
  /** Number of procedures matching, all pages together. */
  total: z.int().nonnegative(),
});
export type ProcedureListResponse = z.infer<typeof procedureListResponseSchema>;

export const procedureDetailSchema = procedureSummarySchema.extend({
  translationStatus: translationStatusSchema,
  /** Steps and explanations, as structured blocks. */
  blocks: z.array(blockSchema),
  eligibility: z.string().nullable(),
  documents: z.array(z.string()),
  offices: z.array(
    z.object({
      name: z.string(),
      acronym: z.string().nullable(),
      address: z.string().nullable(),
      town: z.string().nullable(),
      region: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
    }),
  ),
  faqs: z.array(z.object({ question: z.string(), blocks: z.array(blockSchema) })),
  legalTexts: z.array(z.object({ name: z.string(), description: z.string().nullable() })),
  usefulLinks: z.array(z.object({ name: z.string(), url: httpsUrlSchema })),
  related: z.array(z.object({ slug: z.string(), title: z.string() })),
  /** Official page on e-senegal.sn, shown as "Source : e-senegal.sn" with a link. */
  sourceUrl: officialSourceUrlSchema,
  fetchedAt: isoDateTimeSchema,
  version: z.int().positive(),
});
export type ProcedureDetail = z.infer<typeof procedureDetailSchema>;
