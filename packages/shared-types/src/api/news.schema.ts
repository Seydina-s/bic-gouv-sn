import { z } from "zod";
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
  /**
   * Video embedded by the official page. The app shows a card that opens the video
   * on tap: no embedded player (heavy, and it would contact the host unasked).
   */
  z.object({
    type: z.literal("video"),
    provider: z.literal("youtube"),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    url: httpsUrlSchema,
  }),
]);
export type Block = z.infer<typeof blockSchema>;

/**
 * Official PDF linked from the article, served from our own copy so it stays
 * available if the source moves it. Its size lets people decide before downloading.
 */
export const newsDocumentSchema = z.object({
  /** The words of the link on the official page, when it gives some. */
  title: z.string().min(1).nullable(),
  /** Our copy: https in production; plain http only on a local development network. */
  url: z.url({ protocol: /^https?$/ }),
  /** The document on the official site (traceability). */
  sourceUrl: httpsUrlSchema,
  bytes: z.int().positive(),
});
export type NewsDocument = z.infer<typeof newsDocumentSchema>;

/** A recording of the article: title, then text, as the "Écouter" button reads it. */
export const newsAudioSchema = z.object({
  url: z.url(),
  durationMs: z.int().positive(),
});
export type NewsAudio = z.infer<typeof newsAudioSchema>;

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
  /**
   * Institution that published the article ("presidence", "primature"…). A plain
   * string, not the list of institutions: an installed app shows an id it does not
   * know as a generic official source instead of dropping the article. Absent from
   * APIs older than this field (all their articles come from presidence.sn).
   */
  publisher: z.string().min(1).optional(),
});
export type NewsSummary = z.infer<typeof newsSummarySchema>;

export const newsListResponseSchema = z.object({
  items: z.array(newsSummarySchema),
  nextCursor: z.string().nullable(),
  /**
   * Articles matching, all pages together (numbered pages). Optional: absent from
   * search results and from APIs older than this field.
   */
  total: z.int().nonnegative().optional(),
});
export type NewsListResponse = z.infer<typeof newsListResponseSchema>;

/** The newest articles of each section, for the front page rows. */
export const newsSectionsResponseSchema = z.object({
  sections: z.array(
    z.object({
      category: z.string().min(1),
      /** Articles of the section, all pages together. */
      total: z.int().nonnegative(),
      items: z.array(newsSummarySchema),
    }),
  ),
});
export type NewsSectionsResponse = z.infer<typeof newsSectionsResponseSchema>;

export const newsDetailSchema = newsSummarySchema.omit({ excerpt: true }).extend({
  blocks: z.array(blockSchema),
  /**
   * Official page, shown as "Source : <institution>" with a link (traceability). The
   * server only stores pages of official sources (newsArticleSchema); the app checks
   * the link is https, not the list of hosts, so a ministry added later never makes
   * its articles unreadable in installed versions.
   */
  sourceUrl: httpsUrlSchema,
  /** Same content published by other institutions. Absent from older APIs. */
  alsoPublishedBy: z
    .array(z.object({ publisher: z.string().min(1), sourceUrl: httpsUrlSchema }))
    .optional(),
  sourceUpdatedAt: isoDateTimeSchema.nullable(),
  fetchedAt: isoDateTimeSchema,
  version: z.int().positive(),
  /** Official PDFs linked from the article. Absent from APIs older than this field. */
  documents: z.array(newsDocumentSchema).optional(),
  /**
   * The article read aloud in its language (recorded once by our voices), or null
   * when not recorded yet: the app then uses the phone's own voice, in French only.
   * Absent from APIs older than this field.
   */
  audio: newsAudioSchema.nullable().optional(),
});
export type NewsDetail = z.infer<typeof newsDetailSchema>;
