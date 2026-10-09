import {
  isPublished,
  publishedTranslation,
  type Block,
  type Cover,
  type Image,
  type Lang,
  type NewsArticle,
  type NewsDetail,
  type NewsDocument,
  type NewsSummary,
} from "@bgs/shared-types";
import { currentRecording } from "../voices/spoken-text";
import { excerptOf, htmlToBlocks } from "./html-to-blocks";

/** The version the app may show in `lang`: withdrawn versions are hidden. */
/** Excerpts already cut, per version: reading the HTML of each item was most of a list's cost. */
const excerpts = new Map<string, string>();
const MAX_EXCERPTS = 20_000;

function excerptIn(article: NewsArticle, lang: Lang, bodyHtml: string): string {
  const key = `${article.id}:${lang}:${article.contentHash}`;
  let excerpt = excerpts.get(key);
  if (excerpt === undefined) {
    if (excerpts.size >= MAX_EXCERPTS) {
      excerpts.clear();
    }
    excerpt = excerptOf(htmlToBlocks(bodyHtml));
    excerpts.set(key, excerpt);
  }
  return excerpt;
}

function translationIn(article: NewsArticle, lang: Lang) {
  return publishedTranslation(article, lang);
}

/** The source withdrew the version in `lang` (it existed, it is gone for good). */
export function isWithdrawnIn(article: NewsArticle, lang: Lang): boolean {
  return article.translations.some(
    (translation) => translation.lang === lang && !isPublished(translation),
  );
}

function availableLangs(article: NewsArticle): Lang[] {
  return article.translations
    .filter(isPublished)
    .map((translation) => translation.lang)
    .sort();
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

/** Official PDFs of the article, served from our copies. */
function documentsOf(article: NewsArticle, mediaBaseUrl: string): NewsDocument[] {
  return article.attachments.map(({ title, key, sourceUrl, bytes }) => ({
    title,
    url: `${mediaBaseUrl}/${key}`,
    sourceUrl,
    bytes,
  }));
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
    excerpt: excerptIn(article, lang, translation.bodyHtml),
    translationStatus: translation.status,
    availableLangs: availableLangs(article),
    cover: coverOf(article, mediaBaseUrl),
    publisher: article.publisher,
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
    publisher: article.publisher,
    sourceUrl: translation.sourceUrl ?? article.sourceUrl,
    alsoPublishedBy: article.alsoPublishedBy,
    sourceUpdatedAt: article.sourceUpdatedAt,
    fetchedAt: article.fetchedAt,
    version: article.version,
    documents: documentsOf(article, mediaBaseUrl),
    audio: audioOf(article, lang, translation, mediaBaseUrl),
  };
}

/** The recording of this version's current words, under `mediaBaseUrl`, or null. */
function audioOf(
  article: NewsArticle,
  lang: Lang,
  translation: { title: string; bodyHtml: string },
  mediaBaseUrl: string,
): NewsDetail["audio"] {
  const track = currentRecording(article, lang, translation);
  return track === null
    ? null
    : { url: `${mediaBaseUrl}/${track.key}`, durationMs: track.durationMs };
}

/**
 * What makes a cached response stale: the words (content hash), the images, the
 * documents and the withdrawals, which all change without changing the content hash.
 */
export function freshnessKey(article: NewsArticle): string {
  return [
    article.contentHash,
    ...article.images.map((image) => image.originalKey),
    ...article.attachments.map((attachment) => attachment.key),
    ...article.audio.map((track) => track.key),
    // A withdrawn version leaves the "available languages" of the other one.
    ...article.translations.map(({ lang, withdrawnAt }) => `${lang}=${withdrawnAt ?? ""}`),
  ].join(":");
}
