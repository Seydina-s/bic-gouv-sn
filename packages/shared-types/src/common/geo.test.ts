import { describe, expect, it } from "vitest";
import { byDistance, distanceMeters } from "./geo";

// Two public landmarks of Dakar, for orders of magnitude only.
const PLATEAU = { lat: 14.6692, lng: -17.4364 };
const YOFF = { lat: 14.7469, lng: -17.4903 };

describe("distances", () => {
  it("measures the ground distance between two points", () => {
    expect(distanceMeters(PLATEAU, PLATEAU)).toBe(0);
    // About 10.4 km between these two points of Dakar.
    expect(distanceMeters(PLATEAU, YOFF)).toBeGreaterThan(10_000);
    expect(distanceMeters(PLATEAU, YOFF)).toBeLessThan(10_800);
    expect(distanceMeters(PLATEAU, YOFF)).toBeCloseTo(distanceMeters(YOFF, PLATEAU), 6);
  });

  it("sorts items from the nearest", () => {
    const sorted = byDistance(PLATEAU, [{ at: YOFF }, { at: PLATEAU }], (item) => item.at);
    expect(sorted.map(({ item, meters }) => [item.at, Math.round(meters / 1000)])).toEqual([
      [PLATEAU, 0],
      [YOFF, 10],
    ]);
  });
});
