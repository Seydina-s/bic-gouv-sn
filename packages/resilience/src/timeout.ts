import { linkSignal, throwIfAborted } from "./abort";
import { AbortedError, TimeoutError } from "./errors";

export interface TimeoutOptions {
  timeoutMs: number;
  /** Caller cancellation (e.g. screen closed). */
  signal?: AbortSignal;
}

/**
 * Runs `operation` with an explicit deadline. The operation receives a signal it
 * should pass to fetch(); the deadline holds even if it ignores that signal.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { timeoutMs, signal }: TimeoutOptions,
): Promise<T> {
  throwIfAborted(signal);
  const controller = new AbortController();
  const unlink = linkSignal(signal, controller);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Reject first: the abort listener below then has no effect on this promise.
      const error = new TimeoutError(timeoutMs);
      reject(error);
      controller.abort(error);
    }, timeoutMs);
    controller.signal.addEventListener("abort", () => {
      reject(new AbortedError());
    });
  });

  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
    unlink();
  }
}
