/**
 * The launch holds still a moment, the star as the phone's own launch screen left
 * it, while the app beneath draws its first screens and that launch screen fades:
 * started at once, the animation shared those first frames and stuttered (owner's
 * feedback, 03/10/2026). It begins once the app is idle, never later than the limit,
 * on a fresh frame. Returns a function that cancels the wait.
 */
export const SETTLE_MIN_MS = 400;
export const SETTLE_MAX_MS = 1000;

export function afterSettling(begin: () => void): () => void {
  let idle: number | undefined;
  let frame: number | undefined;
  const timer = setTimeout(() => {
    idle = requestIdleCallback(
      () => {
        frame = requestAnimationFrame(begin);
      },
      { timeout: SETTLE_MAX_MS - SETTLE_MIN_MS },
    );
  }, SETTLE_MIN_MS);
  return () => {
    clearTimeout(timer);
    if (idle !== undefined) {
      cancelIdleCallback(idle);
    }
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
    }
  };
}
