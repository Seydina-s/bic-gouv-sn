/**
 * Politeness towards the source: calls are spaced by at least `intervalMs`,
 * in the order they were requested, even when started concurrently.
 */
export function createRateLimiter(
  intervalMs: number,
  now: () => number = Date.now,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
) {
  let nextSlot = 0;
  return async function schedule<T>(task: () => Promise<T>): Promise<T> {
    const start = Math.max(now(), nextSlot);
    nextSlot = start + intervalMs;
    const delay = start - now();
    if (delay > 0) {
      await wait(delay);
    }
    return task();
  };
}
