import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AbortedError, CircuitOpenError } from "./errors";
import { backoffDelay, retry, type RetryOptions } from "./retry";

const options: RetryOptions = {
  idempotent: true,
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  random: () => 1,
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("backoffDelay", () => {
  it("doubles the cap at each attempt, up to the maximum", () => {
    expect([1, 2, 3, 4, 5].map((attempt) => backoffDelay(attempt, options))).toEqual([
      100, 200, 400, 800, 1000,
    ]);
  });

  it("applies full jitter between 0 and the cap", () => {
    expect(backoffDelay(3, { ...options, random: () => 0.5 })).toBe(200);
    expect(backoffDelay(3, { ...options, random: () => 0 })).toBe(0);
  });
});

describe("retry", () => {
  it("returns as soon as an attempt succeeds", async () => {
    const operation = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error("flaky"))
      .mockResolvedValueOnce("ok");
    const pending = retry(operation, options);
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxAttempts and rethrows the last error", async () => {
    const operation = vi.fn((attempt: number) =>
      Promise.reject(new Error(`fail ${String(attempt)}`)),
    );
    const pending = retry(operation, options);
    const assertion = expect(pending).rejects.toThrow("fail 3");
    await vi.advanceTimersByTimeAsync(100 + 200);
    await assertion;
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["an open circuit", new CircuitOpenError("tts")],
    ["a cancellation", new AbortedError()],
  ])("never retries %s", async (_label, error) => {
    const operation = vi.fn(() => Promise.reject(error));
    await expect(retry(operation, options)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("respects the shouldRetry filter", async () => {
    const operation = vi.fn(() => Promise.reject(new Error("404")));
    await expect(retry(operation, { ...options, shouldRetry: () => false })).rejects.toThrow("404");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("stops waiting when cancelled during the backoff", async () => {
    const controller = new AbortController();
    const operation = vi.fn(() => Promise.reject(new Error("down")));
    const pending = retry(operation, { ...options, signal: controller.signal });
    const assertion = expect(pending).rejects.toBeInstanceOf(AbortedError);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await assertion;
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("does not start when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn(() => Promise.resolve(1));
    await expect(
      retry(operation, { ...options, signal: controller.signal }),
    ).rejects.toBeInstanceOf(AbortedError);
    expect(operation).not.toHaveBeenCalled();
  });
});
