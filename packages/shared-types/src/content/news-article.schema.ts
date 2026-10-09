import { z } from "zod";
import { institutionOfUrl, institutionSchema } from "../common/institutions";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import { slugSchema } from "../common/primitives.schema";
import { imageSchema, pdfAttachmentSchema } from "./media.schema";
import { checkTraceableContent, traceableContentShape } from "./traceable-content.schema";

/** Another institution's publication of the same content (kept for traceability). */
export const otherPublicationSchema = z.strictObject({
  publisher: institutionSchema,
  sourceUrl: officialSourceUrlSchema,
});
export type OtherPublication = z.infer<typeof otherPublicationSchema>;

/** A news item ingested from an institution's official site, kept identical to the source. */
export const newsArticleSchema = z
  .strictObject({
    ...traceableContentShape,
    kind: z.literal("news-article"),
    /**
     * Institution whose site published the article. Articles stored before the
     * whole-government scope (09/10/2026) all come from presidence.sn.
     */
    publisher: institutionSchema.default("presidence"),
    /** Same content published by other institutions: shown once, in this version. */
    alsoPublishedBy: z.array(otherPublicationSchema).default([]),
    /**
     * Set when this article repeats one published by the reference institution
     * (owner's decision of 09/10/2026): kept for traceability, never shown; the
     * reference article lists it in `alsoPublishedBy`.
     */
    duplicateOf: z.uuid().optional(),
    /** Section slug as mapped from the source in docs/sources.md; never invented. */
    category: slugSchema,
    images: z.array(imageSchema),
    attachments: z.array(pdfAttachmentSchema),
  })
  .superRefine(checkTraceableContent)
  .superRefine((article, ctx) => {
    if (institutionOfUrl(article.sourceUrl) !== article.publisher) {
      ctx.addIssue({
        code: "custom",
        path: ["publisher"],
        message: "The source page must belong to the publishing institution",
      });
    }
  });
export type NewsArticle = z.infer<typeof newsArticleSchema>;

type NewsTranslation = NewsArticle["translations"][number];

/** A version the source still publishes: the only kind the app may show. */
export function isPublished(translation: NewsTranslation): boolean {
  return translation.withdrawnAt === undefined;
}

/** The version of `article` in `lang` that the app may show, if any. */
export function publishedTranslation(
  article: NewsArticle,
  lang: NewsTranslation["lang"],
): NewsTranslation | undefined {
  return article.duplicateOf === undefined
    ? article.translations.find(
        (translation) => translation.lang === lang && isPublished(translation),
      )
    : undefined;
}

/** Languages the app may show the article in: none for a duplicate. */
export function shownLangs(article: NewsArticle): NewsTranslation["lang"][] {
  return article.duplicateOf === undefined
    ? article.translations.filter(isPublished).map((translation) => translation.lang)
    : [];
}
