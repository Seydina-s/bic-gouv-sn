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
    listNews(lang: Lang, cursor: string | null, signal?: AbortSignal): Promise<NewsListResponse> {
      const query = new URLSearchParams({ lang, limit: "20" });
      if (cursor !== null) {
        query.set("cursor", cursor);
      }
      return getJson(`/v1/news?${query.toString()}`, readNewsList, signal);
    },
    getNews(id: string, lang: Lang, signal?: AbortSignal): Promise<NewsDetail> {
      return getJson(`/v1/news/${encodeURIComponent(id)}?lang=${lang}`, readNewsDetail, signal);
    },
  };
}

export type NewsClient = ReturnType<typeof createNewsClient>;
