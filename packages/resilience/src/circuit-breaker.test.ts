import { beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker, type CircuitBreakerOptions } from "./circuit-breaker";
import { CircuitOpenError } from "./errors";

let clock = 0;
const fail = () => Promise.reject(new Error("down"));
const succeed = () => Promise.resolve("ok");

function createBreaker(overrides: Partial<CircuitBreakerOptions> = {}) {
  return new CircuitBreaker({
    dependency: "presidence.sn",
    failureThreshold: 3,
    resetTimeoutMs: 30_000,
    now: () => clock,
    ...overrides,
  });
}

async function failTimes(breaker: CircuitBreaker, times: number) {
  for (let i = 0; i < times; i += 1) {
    await expect(breaker.execute(fail)).rejects.toThrow();
  }
}

beforeEach(() => {
  clock = 0;
});

describe("CircuitBreaker", () => {
  it("stays closed below the failure threshold", async () => {
    const breaker = createBreaker();
    await failTimes(breaker, 2);
    expect(breaker.snapshot()).toMatchObject({ state: "closed", consecutiveFailures: 2 });
  });

  it("resets the failure count after a success", async () => {
    const breaker = createBreaker();
    await failTimes(breaker, 2);
    await breaker.execute(succeed);
    await failTimes(breaker, 2);
    expect(breaker.snapshot().state).toBe("closed");
  });

  it("opens at the threshold and then fails fast without calling", async () => {
    const breaker = createBreaker();
    await failTimes(breaker, 3);
    const operation = vi.fn(succeed);
    await expect(breaker.execute(operation)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(operation).not.toHaveBeenCalled();
    expect(breaker.snapshot()).toMatchObject({ state: "open", openedAt: 0 });
  });

  it("allows a single trial call after the cool-down, and closes on success", async () => {
    const breaker = createBreaker();
    await failTimes(breaker, 3);
    clock = 30_000;
    expect(breaker.snapshot().state).toBe("half-open");

    let finishTrial: (value: string) => void = () => undefined;
    const trial = breaker.execute(() => new Promise<string>((resolve) => (finishTrial = resolve)));
    await expect(breaker.execute(succeed)).rejects.toBeInstanceOf(CircuitOpenError);
    finishTrial("ok");
    await expect(trial).resolves.toBe("ok");
    expect(breaker.snapshot()).toMatchObject({ state: "closed", openedAt: null });
  });

  it("reopens immediately when the trial call fails", async () => {
    const breaker = createBreaker();
    await failTimes(breaker, 3);
    clock = 30_000;
    await failTimes(breaker, 1);
    expect(breaker.snapshot()).toMatchObject({ state: "open", openedAt: 30_000 });
  });

  it("ignores errors that do not reflect the dependency's health", async () => {
    const breaker = createBreaker({ isFailure: () => false });
    await failTimes(breaker, 5);
    expect(breaker.snapshot()).toMatchObject({ state: "closed", consecutiveFailures: 0 });
  });

  it("closes after a trial that fails with an ignored error", async () => {
    let healthRelated = true;
    const breaker = createBreaker({ isFailure: () => healthRelated });
    await failTimes(breaker, 3);
    clock = 30_000;
    healthRelated = false;
    await failTimes(breaker, 1);
    expect(breaker.snapshot().state).toBe("closed");
  });

  it("reports each state change for the admin supervision", async () => {
    const onStateChange = vi.fn();
    const breaker = createBreaker({ onStateChange });
    await failTimes(breaker, 3);
    clock = 30_000;
    await breaker.execute(succeed);
    expect(
      onStateChange.mock.calls.map(([snapshot]) => (snapshot as { state: string }).state),
    ).toEqual(["open", "half-open", "closed"]);
  });

  it("uses the real clock by default", () => {
    const breaker = new CircuitBreaker({
      dependency: "tts",
      failureThreshold: 1,
      resetTimeoutMs: 1,
    });
    expect(breaker.snapshot().state).toBe("closed");
  });
});
