import { strokeProgress } from "./launch-strokes";

describe("strokeProgress", () => {
  it("draws the strokes one after the other, all of them by the end", () => {
    const count = 13;
    expect(strokeProgress(0, 0, count)).toBe(0);
    expect(strokeProgress(0.35, 0, count)).toBe(1);
    expect(strokeProgress(0.35, count - 1, count)).toBe(0);
    for (let index = 0; index < count; index += 1) {
      expect(strokeProgress(1, index, count)).toBe(1);
    }
    // Later strokes are never ahead of earlier ones.
    expect(strokeProgress(0.5, 3, count)).toBeGreaterThanOrEqual(strokeProgress(0.5, 4, count));
  });
});
