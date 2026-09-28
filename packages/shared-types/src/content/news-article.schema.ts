import { z } from "zod";
import { slugSchema } from "../common/primitives.schema";
import { imageSchema, pdfAttachmentSchema } from "./media.schema";
import { checkTraceableContent, traceableContentShape } from "./traceable-content.schema";

/** A news item ingested from presidence.sn, kept identical to the source. */
export const newsArticleSchema = z
  .strictObject({
    ...traceableContentShape,
    kind: z.literal("news-article"),
    /** Section slug as mapped from presidence.sn in docs/sources.md; never invented. */
    category: slugSchema,
    images: z.array(imageSchema),
    attachments: z.array(pdfAttachmentSchema),
  })
  .superRefine(checkTraceableContent);
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
  return article.translations.find(
    (translation) => translation.lang === lang && isPublished(translation),
  );
}
