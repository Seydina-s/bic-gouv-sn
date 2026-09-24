import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";
import { CircuitOpenError, TimeoutError } from "./errors";
import { createResilientCall } from "./resilient-call";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function breaker(failureThreshold = 5) {
  return new CircuitBreaker({ dependency: "test", failureThreshold, resetTimeoutMs: 60_000 });
}

const retryOptions = {
  idempotent: true,
  maxAttempts: 3,
  baseDelayMs: 10,
  maxDelayMs: 10,
  random: () => 1,
} as const;

describe("createResilientCall", () => {
  it("runs a non-idempotent operation exactly once", async () => {
    const call = createResilientCall({ breaker: breaker(), timeoutMs: 100 });
    const operation = vi.fn(() => Promise.reject(new Error("write failed")));
    await expect(call(operation)).rejects.toThrow("write failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries attempts that time out", async () => {
    const call = createResilientCall({ breaker: breaker(), timeoutMs: 100, retry: retryOptions });
    const operation = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValueOnce("ok");
    const pending = call(operation);
    await vi.advanceTimersByTimeAsync(100 + 10);
    await expect(pending).resolves.toBe("ok");
  });

  it("stops retrying as soon as the circuit opens", async () => {
    const call = createResilientCall({ breaker: breaker(2), timeoutMs: 100, retry: retryOptions });
    const operation = vi.fn(() => Promise.reject(new Error("down")));
    const pending = call(operation);
    const assertion = expect(pending).rejects.toBeInstanceOf(CircuitOpenError);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("forwards the caller's cancellation", async () => {
    const controller = new AbortController();
    const call = createResilientCall({ breaker: breaker(), timeoutMs: 100, retry: retryOptions });
    const pending = call(() => new Promise(() => undefined), controller.signal);
    const assertion = expect(pending).rejects.not.toBeInstanceOf(TimeoutError);
    controller.abort();
    await assertion;
  });

  it("forwards the cancellation without retries too", async () => {
    const controller = new AbortController();
    const call = createResilientCall({ breaker: breaker(), timeoutMs: 100 });
    const pending = call(() => new Promise(() => undefined), controller.signal);
    const assertion = expect(pending).rejects.toThrow("cancelled");
    controller.abort();
    await assertion;
  });
});
