import {
  readNewsDetail,
  readNewsList,
  type Lang,
  type NewsDetail,
  type NewsListResponse,
} from "@bgs/shared-types";
import { withTimeout } from "@bgs/resilience";

export class NewsApiError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "NewsApiError";
  }
}

export interface NewsClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Talks to /v1/news. Every response is validated before reaching the screens, by a
 * tolerant reader: a newer API never breaks this installed version.
 */
export function createNewsClient({
  baseUrl,
  // Looked up at call time: a fetch replaced later (tests, interceptors) is honoured.
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = 10_000,
}: NewsClientOptions) {
  async function getJson<T>(path: string, read: (raw: unknown) => T | null, signal?: AbortSignal) {
    const response = await withTimeout(
      (timeoutSignal) => fetchImpl(`${baseUrl}${path}`, { signal: timeoutSignal }),
      signal === undefined ? { timeoutMs } : { timeoutMs, signal },
    );
    if (!response.ok) {
      throw new NewsApiError(
        response.status,
        `GET ${path} failed with HTTP ${String(response.status)}`,
      );
    }
    const data = read(await response.json());
    if (data === null) {
      throw new NewsApiError(null, `GET ${path} returned an unexpected shape`);
    }
    return data;
  }

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
