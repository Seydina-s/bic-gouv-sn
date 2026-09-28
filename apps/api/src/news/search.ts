import type { ArticleRepository } from "@bgs/content-store";
import type { Lang, NewsArticle } from "@bgs/shared-types";
import { RecentResults } from "../search/recent-results";
import { PreparedTexts, searchTerms, type Searchable } from "../search/text-search";

/** Search over the article store: title matches rank first, then the newest. */

const PAGE_SIZE = 200;
/** Articles made ready for searching once per version, not at every search. */
const prepared = new PreparedTexts();
/** A repeated search is reused for 60 s, as long as the public cache keeps its answer. */
const RECENT_MS = 60_000;
const RECENT_QUERIES = 500;
const recentByStore = new WeakMap<ArticleRepository, RecentResults<NewsArticle[]>>();

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
  let recent = recentByStore.get(articles);
  if (recent === undefined) {
    recent = new RecentResults(RECENT_MS, RECENT_QUERIES);
    recentByStore.set(articles, recent);
  }
  return recent.get(`${lang}|${String(limit)}|${terms.join(" ")}`, async () =>
    prepared
      .rank(await allArticles(articles, lang), terms, (article) => searchableIn(article, lang))
      .slice(0, limit),
  );
}
