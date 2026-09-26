import {
  readNewsDetail,
  readNewsList,
  readNewsSections,
  type Lang,
  type NewsDetail,
  type NewsListResponse,
  type NewsSectionsResponse,
} from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

export { NewsApiError } from "./json-getter";
export type { ApiClientOptions as NewsClientOptions } from "./json-getter";

/** Stories per numbered page of a section. */
export const SECTION_PAGE_SIZE = 20;
/** Stories per front page row, before "Voir plus". */
export const ROW_SIZE = 10;

/**
 * Talks to /v1/news. Every response is validated before reaching the screens, by a
 * tolerant reader: a newer API never breaks this installed version.
 */
export function createNewsClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);

  return {
    /** One page of the feed, optionally limited to one section. */
    listNews(
      lang: Lang,
      cursor: string | null,
      signal?: AbortSignal,
      category: string | null = null,
    ): Promise<NewsListResponse> {
      const query = new URLSearchParams({ lang, limit: "20" });
      if (cursor !== null) {
        query.set("cursor", cursor);
      }
      if (category !== null) {
        query.set("category", category);
      }
      return getJson(`/v1/news?${query.toString()}`, readNewsList, signal);
    },
    /** Numbered page of one section (from 1), with the total when the API gives it. */
    sectionPage(
      lang: Lang,
      category: string,
      page: number,
      signal?: AbortSignal,
    ): Promise<NewsListResponse> {
      const query = new URLSearchParams({
        lang,
        limit: String(SECTION_PAGE_SIZE),
        category,
        page: String(page),
      });
      return getJson(`/v1/news?${query.toString()}`, readNewsList, signal);
    },
    /** The newest stories of every section, for the front page rows (one request). */
    sections(lang: Lang, signal?: AbortSignal): Promise<NewsSectionsResponse> {
      const query = new URLSearchParams({ lang, perSection: String(ROW_SIZE) });
      return getJson(`/v1/news/sections?${query.toString()}`, readNewsSections, signal);
    },
    /** Stories matching a query (accents and case ignored), best matches first. */
    searchNews(lang: Lang, query: string, signal?: AbortSignal): Promise<NewsListResponse> {
      const params = new URLSearchParams({ lang, q: query, limit: "30" });
      return getJson(`/v1/news/search?${params.toString()}`, readNewsList, signal);
    },
    /** Newest story of one section, or null when the section has none in this language. */
    async latestIn(lang: Lang, category: string, signal?: AbortSignal) {
      const query = new URLSearchParams({ lang, limit: "1", category });
      const page = await getJson(`/v1/news?${query.toString()}`, readNewsList, signal);
      return page.items[0] ?? null;
    },
    getNews(id: string, lang: Lang, signal?: AbortSignal): Promise<NewsDetail> {
      return getJson(`/v1/news/${encodeURIComponent(id)}?lang=${lang}`, readNewsDetail, signal);
    },
  };
}

export type NewsClient = ReturnType<typeof createNewsClient>;
