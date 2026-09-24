/** Error codes match docs/errors-catalog.md, where each gets a plain-language explanation. */

export class TimeoutError extends Error {
  readonly code = "RESILIENCE_TIMEOUT";

  constructor(readonly timeoutMs: number) {
    super(`Operation timed out after ${String(timeoutMs)} ms`);
    this.name = "TimeoutError";
  }
}

export class CircuitOpenError extends Error {
  readonly code = "RESILIENCE_CIRCUIT_OPEN";

  constructor(readonly dependency: string) {
    super(`Circuit for "${dependency}" is open: calls are paused`);
    this.name = "CircuitOpenError";
  }
}

export class AbortedError extends Error {
  readonly code = "RESILIENCE_ABORTED";

  constructor() {
    super("Operation was cancelled");
    this.name = "AbortedError";
  }
}
