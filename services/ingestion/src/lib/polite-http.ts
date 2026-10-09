import { CircuitBreaker, createResilientCall } from "@bgs/resilience";
import { QuarantineError, SourceUnreachableError } from "./errors";
import { createRateLimiter } from "./rate-limiter";

/** Identifies the project to the sources, as a polite crawler should. */
export const USER_AGENT = "BicGouvSN-ingestion/0.1 (+https://github.com/Seydina-s/bic-gouv-sn)";

export interface PoliteHttpOptions {
  /** Name of the source in the console's circuit list (e.g. "presidence.sn"). */
  dependency: string;
  fetchImpl?: typeof fetch;
  /** Minimum spacing between two requests to the source (politeness). */
  intervalMs?: number;
}

export interface PoliteHttp {
  breaker: CircuitBreaker;
  /**
   * Fetches `url` and reads its body with `read`, both under the source's timeout,
   * retries and circuit breaker, one request at a time at the polite pace. Throws
   * SourceUnreachableError on a network failure or an HTTP error.
   */
  read<T>(
    url: string,
    read: (response: Response) => Promise<T>,
    headers?: Record<string, string>,
  ): Promise<T>;
}

/**
 * The one way the collection talks to an official site (CLAUDE.md §4.5): explicit
 * timeout, retries with backoff on idempotent reads only, a circuit breaker per
 * source, and at most one request per `intervalMs`.
 */
export function createPoliteHttp({
  dependency,
  fetchImpl = fetch,
  intervalMs = 1000,
}: PoliteHttpOptions): PoliteHttp {
  const schedule = createRateLimiter(intervalMs);
  const breaker = new CircuitBreaker({
    dependency,
    failureThreshold: 5,
    resetTimeoutMs: 60_000,
    isFailure: (error) => !(error instanceof QuarantineError),
  });
  const call = createResilientCall({
    breaker,
    timeoutMs: 15_000,
    retry: {
      idempotent: true,
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      // A 4xx (e.g. an article removed at the source) is not transient: no retry.
      shouldRetry: (error) =>
        !(error instanceof SourceUnreachableError && error.status !== null && error.status < 500),
    },
  });

  return {
    breaker,
    read: (url, read, headers = {}) =>
      call((signal) =>
        schedule(async () => {
          const response = await fetchImpl(url, {
            signal,
            headers: { ...headers, "User-Agent": USER_AGENT },
          }).catch((error: unknown) => {
            // Network failure (DNS, TLS, connection reset): reported with its catalog code.
            throw signal.aborted ? error : new SourceUnreachableError(url, null);
          });
          if (!response.ok) {
            throw new SourceUnreachableError(url, response.status);
          }
          return read(response);
        }),
      ),
  };
}
