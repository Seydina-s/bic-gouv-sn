import { AbortedError } from "./errors";

/**
 * Hand-written equivalents of AbortSignal.any / AbortSignal.timeout,
 * which the mobile JS engine (Hermes) does not guarantee.
 */

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new AbortedError();
  }
}

/** Aborts `controller` when `parent` aborts. Returns a function that removes the link. */
export function linkSignal(parent: AbortSignal | undefined, controller: AbortController) {
  if (parent === undefined) {
    return () => undefined;
  }
  const abort = () => {
    controller.abort(new AbortedError());
  };
  parent.addEventListener("abort", abort, { once: true });
  return () => {
    parent.removeEventListener("abort", abort);
  };
}

/** Resolves after `ms`, or rejects with AbortedError as soon as `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortedError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
