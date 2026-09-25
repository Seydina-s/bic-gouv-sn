import type { Lang, NewsArticle, NewsDetail, NewsSummary } from "@bgs/shared-types";
import { excerptOf, htmlToBlocks } from "./html-to-blocks";

function translationIn(article: NewsArticle, lang: Lang) {
  return article.translations.find((translation) => translation.lang === lang);
}

function availableLangs(article: NewsArticle): Lang[] {
  return article.translations.map((translation) => translation.lang).sort();
}

/** Feed entry in `lang`, or null when the article has no version in that language. */
export function toSummary(article: NewsArticle, lang: Lang): NewsSummary | null {
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
  };
}

/** Full article in `lang`, or null when the article has no version in that language. */
export function toDetail(article: NewsArticle, lang: Lang): NewsDetail | null {
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
    blocks: htmlToBlocks(translation.bodyHtml),
    sourceUrl: translation.sourceUrl ?? article.sourceUrl,
    sourceUpdatedAt: article.sourceUpdatedAt,
    fetchedAt: article.fetchedAt,
    version: article.version,
  };
}
