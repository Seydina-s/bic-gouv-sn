import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import { isoDateTimeSchema, langSchema } from "../common/primitives.schema";

/**
 * - official: published by the source itself (e.g. presidence.sn/wo/)
 * - machine: automatic translation, labelled as such in the app
 * - reviewed: machine translation checked by a human reviewer
 */
export const translationStatusSchema = z.enum(["official", "machine", "reviewed"]);
export type TranslationStatus = z.infer<typeof translationStatusSchema>;

export const humanReviewSchema = z.strictObject({
  reviewerId: z.string().min(1),
  reviewedAt: isoDateTimeSchema,
});

export const translationSchema = z
  .strictObject({
    lang: langSchema,
    status: translationStatusSchema,
    title: z.string().trim().min(1),
    bodyHtml: z.string().trim().min(1),
    sourceUrl: officialSourceUrlSchema.optional(),
    review: humanReviewSchema.optional(),
  })
  .superRefine((translation, ctx) => {
    if (translation.status === "official" && translation.sourceUrl === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceUrl"],
        message: "An official translation must link to its source page",
      });
    }
    const isReviewed = translation.status === "reviewed";
    if (isReviewed !== (translation.review !== undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["review"],
        message: "A review is required for, and only for, reviewed translations",
      });
    }
  });
export type Translation = z.infer<typeof translationSchema>;
