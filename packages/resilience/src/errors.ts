import type { ErrorCode } from "@bgs/shared-types";

/** Codes are declared in the shared error catalog (docs/errors-catalog.md). */

export class TimeoutError extends Error {
  readonly code: ErrorCode = "RESILIENCE_TIMEOUT";

  constructor(readonly timeoutMs: number) {
    super(`Operation timed out after ${String(timeoutMs)} ms`);
    this.name = "TimeoutError";
  }
}

export class CircuitOpenError extends Error {
  readonly code: ErrorCode = "RESILIENCE_CIRCUIT_OPEN";

  constructor(readonly dependency: string) {
    super(`Circuit for "${dependency}" is open: calls are paused`);
    this.name = "CircuitOpenError";
  }
}

export class AbortedError extends Error {
  readonly code: ErrorCode = "RESILIENCE_ABORTED";

  constructor() {
    super("Operation was cancelled");
    this.name = "AbortedError";
  }
}
