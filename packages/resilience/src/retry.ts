import { sleep, throwIfAborted } from "./abort";
import { AbortedError, CircuitOpenError } from "./errors";

export interface RetryOptions {
  /**
   * Must be explicitly true: only idempotent operations may be retried
   * (CLAUDE.md §4.5). A write without an idempotency key must not use retry().
   */
  idempotent: true;
  /** Total attempts, first one included. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Extra filter, e.g. do not retry a 404. Paused circuits and cancellations never retry. */
  shouldRetry?: (error: unknown) => boolean;
  signal?: AbortSignal;
  /** Injected for tests; defaults to Math.random. */
  random?: () => number;
}

/** "Full jitter" backoff: a random delay up to an exponentially growing cap. */
export function backoffDelay(
  attempt: number,
  { baseDelayMs, maxDelayMs, random = Math.random }: RetryOptions,
): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(random() * cap);
}

function isRetryable(error: unknown, options: RetryOptions): boolean {
  if (error instanceof CircuitOpenError || error instanceof AbortedError) {
    return false;
  }
  return options.shouldRetry?.(error) ?? true;
}

export async function retry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    throwIfAborted(options.signal);
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= options.maxAttempts || !isRetryable(error, options)) {
        throw error;
      }
      await sleep(backoffDelay(attempt, options), options.signal);
    }
  }
}
