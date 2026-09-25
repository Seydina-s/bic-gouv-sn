import type { Cover, Lang, NewsArticle, NewsDetail, NewsSummary } from "@bgs/shared-types";
import { excerptOf, htmlToBlocks } from "./html-to-blocks";

function translationIn(article: NewsArticle, lang: Lang) {
  return article.translations.find((translation) => translation.lang === lang);
}

function availableLangs(article: NewsArticle): Lang[] {
  return article.translations.map((translation) => translation.lang).sort();
}

/** Public cover of an article: its first image, with URLs under `mediaBaseUrl`. */
export function coverOf(article: NewsArticle, mediaBaseUrl: string): Cover | null {
  const image = article.images[0];
  if (image === undefined) {
    return null;
  }
  return {
    width: image.width,
    height: image.height,
    blurhash: image.blurhash,
    sources: image.variants.map(({ format, width, key }) => ({
      format,
      width,
      url: `${mediaBaseUrl}/${key}`,
    })),
  };
}

/** Feed entry in `lang`, or null when the article has no version in that language. */
export function toSummary(
  article: NewsArticle,
  lang: Lang,
  mediaBaseUrl: string,
): NewsSummary | null {
  const translation = translationIn(article, lang);
  if (translation === undefined) {
    return null;
  }
  return {
    id: article.id,
    category: article.category,
    publishedOn: article.sourcePublishedOn,
    lang,
    title: translation.title,
    excerpt: excerptOf(htmlToBlocks(translation.bodyHtml)),
    translationStatus: translation.status,
    availableLangs: availableLangs(article),
    cover: coverOf(article, mediaBaseUrl),
  };
}

/** Full article in `lang`, or null when the article has no version in that language. */
export function toDetail(
  article: NewsArticle,
  lang: Lang,
  mediaBaseUrl: string,
): NewsDetail | null {
  const translation = translationIn(article, lang);
  if (translation === undefined) {
    return null;
  }
  return {
    id: article.id,
    category: article.category,
    publishedOn: article.sourcePublishedOn,
    lang,
    title: translation.title,
    translationStatus: translation.status,
    availableLangs: availableLangs(article),
    cover: coverOf(article, mediaBaseUrl),
    blocks: htmlToBlocks(translation.bodyHtml),
    sourceUrl: translation.sourceUrl ?? article.sourceUrl,
    sourceUpdatedAt: article.sourceUpdatedAt,
    fetchedAt: article.fetchedAt,
    version: article.version,
  };
}

/**
 * What makes a cached response stale: the words (content hash) and the cover,
 * which is attached after the article without changing its content hash.
 */
export function freshnessKey(article: NewsArticle): string {
  return `${article.contentHash}:${article.images[0]?.originalKey ?? "-"}`;
}
