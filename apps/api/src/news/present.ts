import type {
  Block,
  Cover,
  Image,
  Lang,
  NewsArticle,
  NewsDetail,
  NewsSummary,
} from "@bgs/shared-types";
import { excerptOf, htmlToBlocks } from "./html-to-blocks";

function translationIn(article: NewsArticle, lang: Lang) {
  return article.translations.find((translation) => translation.lang === lang);
}

function availableLangs(article: NewsArticle): Lang[] {
  return article.translations.map((translation) => translation.lang).sort();
}

/** A stored image as the public API shows it, with URLs under `mediaBaseUrl`. */
function presentImage(image: Image, mediaBaseUrl: string): Cover {
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

/** Public cover of an article, or null when it has none. */
export function coverOf(article: NewsArticle, mediaBaseUrl: string): Cover | null {
  const cover = article.images.find((image) => image.role === "cover");
  return cover === undefined ? null : presentImage(cover, mediaBaseUrl);
}

/** Article blocks where each image we stored points to our lighter copies. */
function blocksOf(article: NewsArticle, bodyHtml: string, mediaBaseUrl: string): Block[] {
  const stored = new Map(article.images.map((image) => [image.originalUrl, image]));
  return htmlToBlocks(bodyHtml).map((block) => {
    const image = block.type === "image" ? stored.get(block.src) : undefined;
    return image === undefined ? block : { ...block, media: presentImage(image, mediaBaseUrl) };
  });
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
    blocks: blocksOf(article, translation.bodyHtml, mediaBaseUrl),
    sourceUrl: translation.sourceUrl ?? article.sourceUrl,
    sourceUpdatedAt: article.sourceUpdatedAt,
    fetchedAt: article.fetchedAt,
    version: article.version,
  };
}

/**
 * What makes a cached response stale: the words (content hash) and the images,
 * which are attached after the article without changing its content hash.
 */
export function freshnessKey(article: NewsArticle): string {
  return [article.contentHash, ...article.images.map((image) => image.originalKey)].join(":");
}
