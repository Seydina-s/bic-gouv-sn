import type { CircuitBreaker } from "./circuit-breaker";
import { retry, type RetryOptions } from "./retry";
import { withTimeout } from "./timeout";

export interface ResilientCallOptions {
  breaker: CircuitBreaker;
  /** Deadline for each attempt. */
  timeoutMs: number;
  /** Omit for non-idempotent operations: they then run once. */
  retry?: Omit<RetryOptions, "signal">;
}

/**
 * Standard wrapper for every external call: each attempt goes through the circuit
 * breaker and has its own deadline; retries stop as soon as the circuit opens.
 */
export function createResilientCall({
  breaker,
  timeoutMs,
  retry: retryOptions,
}: ResilientCallOptions) {
  return function call<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const attempt = () =>
      breaker.execute(() =>
        withTimeout(operation, signal === undefined ? { timeoutMs } : { timeoutMs, signal }),
      );
    if (retryOptions === undefined) {
      return attempt();
    }
    return retry(attempt, signal === undefined ? retryOptions : { ...retryOptions, signal });
  };
}
