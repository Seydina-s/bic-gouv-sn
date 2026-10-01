import { describe, expect, it } from "vitest";
import { GROWTH_FACTOR, GROWTH_FLOOR, unusualGrowth } from "./subscriber-growth";

describe("unusualGrowth", () => {
  it("stays quiet under the floor, even from nothing", () => {
    expect(unusualGrowth({ newLastDay: GROWTH_FLOOR - 1, newWeekBefore: 0 })).toBeNull();
  });

  it("stays quiet at the usual pace, however large", () => {
    expect(unusualGrowth({ newLastDay: 10_000, newWeekBefore: 7 * 3_000 })).toBeNull();
  });

  it("speaks up far above the usual pace, giving that pace per day", () => {
    expect(unusualGrowth({ newLastDay: GROWTH_FLOOR, newWeekBefore: 0 })).toEqual({
      count: GROWTH_FLOOR,
      usual: 0,
    });
    const usual = 200;
    expect(
      unusualGrowth({ newLastDay: GROWTH_FACTOR * usual + 1, newWeekBefore: 7 * usual }),
    ).toEqual({ count: GROWTH_FACTOR * usual + 1, usual });
    expect(
      unusualGrowth({ newLastDay: GROWTH_FACTOR * usual, newWeekBefore: 7 * usual }),
    ).toBeNull();
  });
});
