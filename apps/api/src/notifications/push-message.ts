import { publishedTranslation, type Lang, type NewsArticle } from "@bgs/shared-types";
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

/** What a notification announces: one official article, nothing written by hand. */
export interface PushMessage {
  articleId: string;
  category: string;
  /** JPEG (every phone shows it) of the cover; null without a public media address. */
  imageUrl: string | null;
  /** Per language the article is published in. */
  versions: Partial<Record<Lang, PushVersion>>;
}

const LANGS: readonly Lang[] = ["fr", "wo"];

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
    versions,
  };
}

/** The version for someone reading in `lang`: theirs, else French, else any. */
export function versionFor(message: PushMessage, lang: Lang): PushVersion | undefined {
  return message.versions[lang] ?? message.versions.fr ?? Object.values(message.versions)[0];
}
