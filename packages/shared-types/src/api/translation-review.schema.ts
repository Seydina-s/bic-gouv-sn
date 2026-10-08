import { z } from "zod";

/*
 * The console's queue of machine translations into Wolof (CLAUDE.md §1: labelled
 * « traduction automatique » until a person reviews them). A Wolof speaker reads
 * the French and the Wolof side by side, then validates or sets the Wolof aside.
 */

export const translationToReviewSchema = z.object({
  articleId: z.string().min(1),
  publishedOn: z.iso.date().nullable(),
  frenchTitle: z.string().min(1),
  wolofTitle: z.string().min(1),
});
export type TranslationToReview = z.infer<typeof translationToReviewSchema>;

export const translationsToReviewSchema = z.object({
  /** Newest first. */
  translations: z.array(translationToReviewSchema),
});

const versionSchema = z.object({
  title: z.string().min(1),
  /** The readable text, one entry per paragraph, heading or list. */
  paragraphs: z.array(z.string()),
});

export const translationReviewDetailSchema = z.object({
  articleId: z.string().min(1),
  publishedOn: z.iso.date().nullable(),
  /** The official French page. */
  sourceUrl: z.url(),
  french: versionSchema,
  wolof: versionSchema,
});
export type TranslationReviewDetail = z.infer<typeof translationReviewDetailSchema>;

/** Validate: shown without the label. Set aside: the article goes back to French only. */
export const translationDecisionSchema = z.strictObject({
  decision: z.enum(["validate", "set-aside"]),
});
export type TranslationDecision = z.infer<typeof translationDecisionSchema>;
