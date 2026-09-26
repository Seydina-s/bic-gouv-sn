import type { ArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";

/*
 * Provisional search over the article store (Meilisearch replaces it in production,
 * with typo tolerance, behind the same route). Case and accents are ignored, so
 * "senegal" finds "Sénégal" and Wolof letters (ë, ñ, ŋ) match their plain forms;
 * every word typed must appear; title matches rank first, then the newest.
 */

const PAGE_SIZE = 200;
const TITLE_WEIGHT = 3;

/** Lowercase, without diacritics or punctuation, single-spaced. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ŋ/g, "n")
    .replace(/Ŋ/g, "n")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchTerms(query: string): string[] {
  return [
    ...new Set(
      normalizeForSearch(query)
        .split(" ")
        // Numbers always count ("Conseil du 3 septembre"); lone letters do not.
        .filter((term) => term.length >= 2 || /^\p{N}+$/u.test(term)),
    ),
  ];
}

function occurrences(haystack: string, term: string): number {
  let count = 0;
  for (let at = haystack.indexOf(term); at !== -1; at = haystack.indexOf(term, at + term.length)) {
    count += 1;
  }
  return count;
}

/** Relevance of one language version, or 0 when a term is missing. */
export function scoreArticle(article: NewsArticle, lang: Lang, terms: readonly string[]): number {
  const translation = article.translations.find((candidate) => candidate.lang === lang);
  if (translation === undefined || terms.length === 0) {
    return 0;
  }
  const title = normalizeForSearch(translation.title);
  const body = normalizeForSearch(translation.bodyHtml);
  let score = 0;
  for (const term of terms) {
    const hits = occurrences(title, term) * TITLE_WEIGHT + occurrences(body, term);
    if (hits === 0) {
      return 0;
    }
    score += hits;
  }
  return score;
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
