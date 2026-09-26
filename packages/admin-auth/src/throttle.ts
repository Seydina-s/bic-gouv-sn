/**
 * Guessing protection: after 5 failed sign-ins within 15 minutes, the account is
 * locked for 15 minutes. Counted per account (and, at the API, per address too).
 */
export const MAX_FAILURES = 5;
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;

export interface AttemptState {
  /** Times of recent failures, oldest first. */
  failures: number[];
  lockedUntil: number | null;
}

export const NO_ATTEMPTS: AttemptState = { failures: [], lockedUntil: null };

export function isLocked(state: AttemptState, nowMs: number): boolean {
  return state.lockedUntil !== null && nowMs < state.lockedUntil;
}

export function recordFailure(state: AttemptState, nowMs: number): AttemptState {
  const failures = [...state.failures.filter((at) => nowMs - at < FAILURE_WINDOW_MS), nowMs];
  return failures.length >= MAX_FAILURES
    ? { failures: [], lockedUntil: nowMs + LOCK_MS }
    : { failures, lockedUntil: isLocked(state, nowMs) ? state.lockedUntil : null };
}

/** A successful sign-in clears the count. */
export function recordSuccess(): AttemptState {
  return NO_ATTEMPTS;
}
