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

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * GET with a time limit, then a tolerant reader: every response is validated
 * before reaching the screens, and a newer API never breaks this installed version.
 */
export function createJsonGetter({
  baseUrl,
  // Looked up at call time: a fetch replaced later (tests, interceptors) is honoured.
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = 10_000,
}: ApiClientOptions) {
  return async function getJson<T>(
    path: string,
    read: (raw: unknown) => T | null,
    signal?: AbortSignal,
  ): Promise<T> {
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
  };
}
