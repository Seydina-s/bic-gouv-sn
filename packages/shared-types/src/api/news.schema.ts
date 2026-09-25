import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import {
  httpsUrlSchema,
  isoDateSchema,
  isoDateTimeSchema,
  langSchema,
  slugSchema,
} from "../common/primitives.schema";
import { translationStatusSchema } from "../content/translation.schema";

/*
 * Public news API (/v1/news). Article bodies travel as structured blocks, not HTML:
 * the app renders them with native components (no web view, nothing executable).
 *
 * Evolution rule: installed apps lag behind the API for months. Objects are not
 * strict (unknown fields are ignored), changes are additive only, and the app
 * reads responses through tolerant-reader.ts (unknown blocks and formats dropped).
 */

/**
 * Photo as lighter variants of the official image (cover, or image in the text).
 * The app picks the smallest source wide enough for its slot, and shows the
 * BlurHash while loading.
 */
export const coverSchema = z.object({
  width: z.int().positive(),
  height: z.int().positive(),
  blurhash: z.string().min(6),
  sources: z
    .array(
      z.object({
        format: z.enum(["avif", "webp", "jpeg"]),
        width: z.int().positive(),
        /** https in production; plain http only on a local development network. */
        url: z.url({ protocol: /^https?$/ }),
      }),
    )
    .min(1),
});
export type Cover = z.infer<typeof coverSchema>;

export const inlineSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  href: httpsUrlSchema.optional(),
});
export type Inline = z.infer<typeof inlineSchema>;

const inlines = z.array(inlineSchema).min(1);

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), inlines }),
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    inlines,
  }),
  z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(inlines).min(1) }),
  z.object({ type: z.literal("quote"), inlines }),
  z.object({
    type: z.literal("image"),
    /** Official source image (traceability, fallback when no stored copy exists). */
    src: httpsUrlSchema,
    alt: z.string().nullable(),
    /** Our lighter stored copies, when the ingestion has processed this image. */
    media: coverSchema.optional(),
  }),
]);
export type Block = z.infer<typeof blockSchema>;

/** One article in a feed, in the requested language. */
export const newsSummarySchema = z.object({
  id: z.uuid(),
  category: slugSchema,
  publishedOn: isoDateSchema.nullable(),
  lang: langSchema,
  title: z.string().min(1),
  /** Opening words of the article, cut on a word boundary: never rewritten. */
  excerpt: z.string(),
  translationStatus: translationStatusSchema,
  /** Languages this article is available in. */
  availableLangs: z.array(langSchema).min(1),
  cover: coverSchema.nullable(),
});
export type NewsSummary = z.infer<typeof newsSummarySchema>;

export const newsListResponseSchema = z.object({
  items: z.array(newsSummarySchema),
  nextCursor: z.string().nullable(),
});
export type NewsListResponse = z.infer<typeof newsListResponseSchema>;

export const newsDetailSchema = newsSummarySchema.omit({ excerpt: true }).extend({
  blocks: z.array(blockSchema),
  /** Official page, shown as "Source : presidence.sn" with a link (traceability). */
  sourceUrl: officialSourceUrlSchema,
  sourceUpdatedAt: isoDateTimeSchema.nullable(),
  fetchedAt: isoDateTimeSchema,
  version: z.int().positive(),
});
export type NewsDetail = z.infer<typeof newsDetailSchema>;
