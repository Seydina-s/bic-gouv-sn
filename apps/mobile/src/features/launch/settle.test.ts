import { afterSettling, SETTLE_MAX_MS, SETTLE_MIN_MS } from "./settle";

describe("afterSettling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("holds the launch still a moment, then starts it on a fresh frame", () => {
    const begin = jest.fn();
    afterSettling(begin);
    jest.advanceTimersByTime(SETTLE_MIN_MS - 1);
    expect(begin).not.toHaveBeenCalled();
    jest.advanceTimersByTime(SETTLE_MAX_MS);
    expect(begin).toHaveBeenCalledTimes(1);
  });

  it("never starts once the launch is gone", () => {
    const begin = jest.fn();
    const cancel = afterSettling(begin);
    cancel();
    jest.advanceTimersByTime(SETTLE_MAX_MS * 2);
    expect(begin).not.toHaveBeenCalled();
  });
});
