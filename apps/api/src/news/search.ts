import type { ArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";
import { PreparedTexts, searchTerms, type Searchable } from "../search/text-search";

/** Search over the article store: title matches rank first, then the newest. */

const PAGE_SIZE = 200;
/** Articles made ready for searching once per version, not at every search. */
const prepared = new PreparedTexts();

/** What is searched in one language version of an article (none if absent). */
function searchableIn(article: NewsArticle, lang: Lang): Searchable | null {
  const translation = article.translations.find((candidate) => candidate.lang === lang);
  return translation === undefined
    ? null
    : {
        key: `${article.id}:${lang}:${article.contentHash}`,
        title: translation.title,
        body: () => translation.bodyHtml,
      };
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
  return prepared
    .rank(await allArticles(articles, lang), terms, (article) => searchableIn(article, lang))
    .slice(0, limit);
}
