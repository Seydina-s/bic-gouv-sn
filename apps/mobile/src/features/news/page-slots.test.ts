import { pageCount, pageSlots } from "./page-slots";

describe("pageSlots", () => {
  it("lists every page when there are few", () => {
    expect(pageSlots(1, 1)).toEqual([1]);
    expect(pageSlots(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the first, the last and the neighbours of the current page", () => {
    expect(pageSlots(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });

  it("keeps the same width near both ends", () => {
    expect(pageSlots(1, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pageSlots(4, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pageSlots(9, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
    expect(pageSlots(12, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
  });

  it("never shows more than 7 slots nor the same page twice", () => {
    for (let count = 1; count <= 40; count += 1) {
      for (let current = 1; current <= count; current += 1) {
        const slots = pageSlots(current, count);
        const numbers = slots.filter((slot) => slot !== "gap");
        expect(slots.length).toBeLessThanOrEqual(7);
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toContain(current);
      }
    }
  });
});

describe("pageCount", () => {
  it("rounds up, with at least one page", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(20, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
  });
});
