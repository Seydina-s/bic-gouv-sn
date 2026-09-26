import type { ArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";
import { scoreText, searchTerms } from "../search/text-search";

/** Search over the article store: title matches rank first, then the newest. */

const PAGE_SIZE = 200;

/** Relevance of one language version, or 0 when a term is missing. */
export function scoreArticle(article: NewsArticle, lang: Lang, terms: readonly string[]): number {
  const translation = article.translations.find((candidate) => candidate.lang === lang);
  return translation === undefined ? 0 : scoreText(translation.title, translation.bodyHtml, terms);
}

async function allArticles(articles: ArticleRepository, lang: Lang): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ lang, limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

/** Best matches first; the store order (newest first) breaks ties. */
export async function searchArticles(
  articles: ArticleRepository,
  { query, lang, limit }: { query: string; lang: Lang; limit: number },
): Promise<NewsArticle[]> {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return [];
  }
  return (await allArticles(articles, lang))
    .map((article, rank) => ({ article, rank, score: scoreArticle(article, lang, terms) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .slice(0, limit)
    .map((hit) => hit.article);
}
