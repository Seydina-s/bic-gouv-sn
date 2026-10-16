import {
  langSchema,
  publishedTranslation,
  type Lang,
  type NewsArticle,
  type Notification,
} from "@bgs/shared-types";
import { excerptOf, htmlToBlocks } from "../news/html-to-blocks";

/** First words shown under the title: a few lines on a locked screen. */
const EXCERPT_LENGTH = 140;
/** Wide enough for a notification, light enough for a slow network. */
const IMAGE_MAX_WIDTH = 960;

export interface PushVersion {
  /** The article's official title in this language. */
  title: string;
  /** Its first words, cut at a word. */
  excerpt: string;
}

/**
 * What a notification says: one official article in its own words, or a message
 * written in the console (approved by a second person all the same).
 */
export interface PushMessage {
  /** The article opened on tap; null for a written message. */
  articleId: string | null;
  /** People are notified per section they follow; null: every subscribed phone. */
  category: string | null;
  /** JPEG (every phone shows it); null without one, or without a public media address. */
  imageUrl: string | null;
  /** The official site the article comes from: "primature.sn"; null for a message. */
  source: string | null;
  /** Per language the article is published in. */
  versions: Partial<Record<Lang, PushVersion>>;
}

const LANGS: readonly Lang[] = langSchema.options;

/** The site of an official page, as people write it: "primature.sn". */
export function siteOf(url: string): string {
  return new URL(url).hostname.replace(/^www./, "");
}

function coverJpegUrl(article: NewsArticle, mediaBaseUrl: string | undefined): string | null {
  const cover = article.images.find((image) => image.role === "cover");
  const jpeg = cover?.variants
    .filter((variant) => variant.format === "jpeg" && variant.width <= IMAGE_MAX_WIDTH)
    .sort((a, b) => b.width - a.width)[0];
  return mediaBaseUrl === undefined || jpeg === undefined ? null : `${mediaBaseUrl}/${jpeg.key}`;
}

/** The message announcing `article`, or null when no version of it is published. */
export function pushMessageFor(
  article: NewsArticle,
  mediaBaseUrl: string | undefined,
): PushMessage | null {
  const versions: Partial<Record<Lang, PushVersion>> = {};
  for (const lang of LANGS) {
    const translation = publishedTranslation(article, lang);
    if (translation !== undefined) {
      versions[lang] = {
        title: translation.title,
        excerpt: excerptOf(htmlToBlocks(translation.bodyHtml), EXCERPT_LENGTH),
      };
    }
  }
  if (Object.keys(versions).length === 0) {
    return null;
  }
  return {
    articleId: article.id,
    category: article.category,
    imageUrl: coverJpegUrl(article, mediaBaseUrl),
    source: siteOf(article.sourceUrl),
    versions,
  };
}

/** A message written in the console, in the language it was written in. */
export function writtenPushMessage(
  notification: Notification,
  mediaBaseUrl: string | undefined,
): PushMessage {
  const { imageKey } = notification;
  return {
    articleId: null,
    category: null,
    imageUrl:
      mediaBaseUrl === undefined || imageKey === null ? null : `${mediaBaseUrl}/${imageKey}`,
    source: null,
    versions: {
      [notification.lang]: { title: notification.title, excerpt: notification.body ?? "" },
    },
  };
}

/** The version for someone reading in `lang`: theirs, else French, else any. */
export function versionFor(message: PushMessage, lang: Lang): PushVersion | undefined {
  return message.versions[lang] ?? message.versions.fr ?? Object.values(message.versions)[0];
}
