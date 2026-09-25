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
