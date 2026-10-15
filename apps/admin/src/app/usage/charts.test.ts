import { describe, expect, it } from "vitest";
import { groupShares } from "./Breakdown";
import { niceCeiling, weekChange } from "./TrendChart";

const day = (n: number, active: number, firstEver = 0) => ({
  day: `2026-10-${String(n).padStart(2, "0")}`,
  active,
  firstEver,
});

describe("the usage charts", () => {
  it("rounds the axis up to a value that reads well", () => {
    expect([0, 1, 7, 13, 240, 2600].map(niceCeiling)).toEqual([1, 1, 10, 20, 250, 5000]);
  });

  it("compares the last 7 days with the 7 before, only with two full weeks", () => {
    const days = [
      ...Array.from({ length: 7 }, (_, n) => day(n + 1, 10, 2)),
      ...Array.from({ length: 7 }, (_, n) => day(n + 8, 15, 1)),
    ];
    expect(weekChange(days, "active")).toBeCloseTo(0.5);
    expect(weekChange(days, "firstEver")).toBeCloseTo(-0.5);
    expect(weekChange(days.slice(1), "active")).toBeNull();
    expect(weekChange(days.map((item) => ({ ...item, active: 0 })), "active")).toBeNull();
  });

  it("keeps the largest shares and groups the rest under « Autres »", () => {
    const rows = [1, 9, 4, 7, 2, 6, 3].map((count, n) => ({ name: `Version ${String(n)}`, count }));
    expect(groupShares(rows, 5)).toEqual([
      { name: "Version 1", count: 9 },
      { name: "Version 3", count: 7 },
      { name: "Version 5", count: 6 },
      { name: "Version 2", count: 4 },
      { name: "Autres", count: 6 },
    ]);
    expect(groupShares(rows.slice(0, 2), 5)).toHaveLength(2);
  });
});
