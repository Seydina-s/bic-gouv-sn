import { phase, staggered, TIMELINE } from "./launch-strokes";

describe("phase", () => {
  it("runs from 0 to 1 within its window, and stays put outside it", () => {
    expect(phase(0, [0.2, 0.6])).toBe(0);
    expect(phase(0.4, [0.2, 0.6])).toBeCloseTo(0.5);
    expect(phase(1, [0.2, 0.6])).toBe(1);
  });
});

describe("staggered", () => {
  it("starts each item a little after the previous one, the last ending with the window", () => {
    const first = staggered([0.3, 0.7], 0, 5);
    const last = staggered([0.3, 0.7], 4, 5);
    expect(first[0]).toBeCloseTo(0.3);
    expect(last[1]).toBeCloseTo(0.7);
    expect(staggered([0.3, 0.7], 2, 5)[0]).toBeGreaterThan(first[0]);
    expect(staggered([0, 1], 0, 1)).toEqual([0, 0.5]);
  });
});

describe("TIMELINE", () => {
  it("grows the tree from the ground to the leaves, ending at 1", () => {
    expect(TIMELINE.ground[0]).toBe(0);
    expect(TIMELINE.trunkOutline[0]).toBeLessThan(TIMELINE.limbs[0]);
    expect(TIMELINE.limbs[0]).toBeLessThan(TIMELINE.crown[0]);
    expect(TIMELINE.crown[1]).toBe(1);
  });
});
