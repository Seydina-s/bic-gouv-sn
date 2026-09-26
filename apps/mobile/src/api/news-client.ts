import {
  readNewsDetail,
  readNewsList,
  type Lang,
  type NewsDetail,
  type NewsListResponse,
} from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

export { NewsApiError } from "./json-getter";
export type { ApiClientOptions as NewsClientOptions } from "./json-getter";

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
