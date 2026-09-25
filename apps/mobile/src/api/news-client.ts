import {
  newsDetailSchema,
  newsListResponseSchema,
  type Lang,
  type NewsDetail,
  type NewsListResponse,
} from "@bgs/shared-types";
import { withTimeout } from "@bgs/resilience";
import type { z } from "zod";

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

/** Talks to /v1/news. Every response is validated before reaching the screens. */
export function createNewsClient({
  baseUrl,
  // Looked up at call time: a fetch replaced later (tests, interceptors) is honoured.
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = 10_000,
}: NewsClientOptions) {
  async function getJson<S extends z.ZodType>(path: string, schema: S, signal?: AbortSignal) {
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
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      throw new NewsApiError(null, `GET ${path} returned an unexpected shape`);
    }
    return parsed.data;
  }

  return {
    listNews(lang: Lang, cursor: string | null, signal?: AbortSignal): Promise<NewsListResponse> {
      const query = new URLSearchParams({ lang, limit: "20" });
      if (cursor !== null) {
        query.set("cursor", cursor);
      }
      return getJson(`/v1/news?${query.toString()}`, newsListResponseSchema, signal);
    },
    getNews(id: string, lang: Lang, signal?: AbortSignal): Promise<NewsDetail> {
      return getJson(`/v1/news/${encodeURIComponent(id)}?lang=${lang}`, newsDetailSchema, signal);
    },
  };
}

export type NewsClient = ReturnType<typeof createNewsClient>;
