import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AbortedError, TimeoutError } from "./errors";
import { withTimeout } from "./timeout";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const never = () => new Promise<never>(() => undefined);

describe("withTimeout", () => {
  it("returns the result when the operation is fast enough", async () => {
    await expect(withTimeout(() => Promise.resolve("ok"), { timeoutMs: 100 })).resolves.toBe("ok");
  });

  it("rejects with TimeoutError even if the operation ignores its signal", async () => {
    const pending = withTimeout(never, { timeoutMs: 100 });
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it("aborts the signal given to the operation on timeout", async () => {
    let received: AbortSignal | undefined;
    const pending = withTimeout(
      (signal) => {
        received = signal;
        return never();
      },
      { timeoutMs: 50 },
    );
    const assertion = expect(pending).rejects.toThrow(TimeoutError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(received?.aborted).toBe(true);
  });

  it("propagates the operation's own error", async () => {
    const failing = () => Promise.reject(new Error("boom"));
    await expect(withTimeout(failing, { timeoutMs: 100 })).rejects.toThrow("boom");
  });

  it("stops when the caller cancels", async () => {
    const controller = new AbortController();
    const pending = withTimeout(never, { timeoutMs: 1000, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(AbortedError);
  });

  it("refuses to start when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn(never);
    await expect(
      withTimeout(operation, { timeoutMs: 100, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortedError);
    expect(operation).not.toHaveBeenCalled();
  });

  it("leaves no timer behind once settled", async () => {
    await withTimeout(() => Promise.resolve(1), { timeoutMs: 100 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
