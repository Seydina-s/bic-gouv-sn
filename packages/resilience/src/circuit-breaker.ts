import { CircuitOpenError } from "./errors";

/**
 * closed: calls go through · open: calls fail fast until the cool-down ends ·
 * half-open: one trial call decides whether to close or reopen.
 */
export type CircuitState = "closed" | "open" | "half-open";

/** What the admin supervision screen shows for each dependency. */
export interface CircuitSnapshot {
  dependency: string;
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
}

export interface CircuitBreakerOptions {
  /** Name shown in the admin, e.g. "presidence.sn", "firecrawl", "tts". */
  dependency: string;
  /** Consecutive failures that open the circuit. */
  failureThreshold: number;
  /** Time the circuit stays open before a trial call. */
  resetTimeoutMs: number;
  /** Errors that do not reflect the dependency's health (e.g. 404) can be excluded. */
  isFailure?: (error: unknown) => boolean;
  onStateChange?: (snapshot: CircuitSnapshot) => void;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private trialInFlight = false;

  constructor(private readonly options: CircuitBreakerOptions) {}

  snapshot(): CircuitSnapshot {
    return {
      dependency: this.options.dependency,
      state: this.currentState(),
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.admit();
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  private currentState(): CircuitState {
    const coolDownOver =
      this.openedAt !== null && this.now() - this.openedAt >= this.options.resetTimeoutMs;
    return this.state === "open" && coolDownOver ? "half-open" : this.state;
  }

  private admit(): void {
    const state = this.currentState();
    if (state === "open" || (state === "half-open" && this.trialInFlight)) {
      throw new CircuitOpenError(this.options.dependency);
    }
    if (state === "half-open") {
      this.trialInFlight = true;
      this.transition("half-open");
    }
  }

  private recordSuccess(): void {
    this.trialInFlight = false;
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.transition("closed");
  }

  private recordError(error: unknown): void {
    const wasTrial = this.trialInFlight;
    this.trialInFlight = false;
    if (!(this.options.isFailure?.(error) ?? true)) {
      if (wasTrial) {
        this.recordSuccess();
      }
      return;
    }
    this.consecutiveFailures += 1;
    if (wasTrial || this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = this.now();
      this.transition("open");
    }
  }

  private transition(next: CircuitState): void {
    if (this.state === next) {
      return;
    }
    this.state = next;
    this.options.onStateChange?.(this.snapshot());
  }
}
