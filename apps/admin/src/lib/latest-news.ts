import "server-only";
import { newsListResponseSchema, type NewsSummary } from "@bgs/shared-types";
import { withTimeout } from "@bgs/resilience";
import { readApiUrl } from "./config";

/** Articles offered when preparing a notification: the newest ones, in French. */
const OFFERED = 20;

/**
 * The newest official articles, read from the public API. Empty when the API is
 * unreachable: the page then says nothing can be prepared, rather than failing.
 */
export async function latestNews(fetchImpl: typeof fetch = fetch): Promise<NewsSummary[]> {
  const apiUrl = readApiUrl(process.env);
  if (apiUrl === null) {
    return [];
  }
  try {
    return await withTimeout(
      async (signal) => {
        const response = await fetchImpl(`${apiUrl}/v1/news?lang=fr&limit=${String(OFFERED)}`, {
          signal,
          cache: "no-store",
        });
        const parsed = newsListResponseSchema.safeParse(await response.json().catch(() => null));
        return response.ok && parsed.success ? parsed.data.items : [];
      },
      { timeoutMs: 3000 },
    );
  } catch {
    return [];
  }
}
