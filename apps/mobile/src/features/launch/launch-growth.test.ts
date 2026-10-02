import { BAOBAB_FOOT, BAOBAB_SIZE } from "../../components/baobab-drawing";
import {
  FULL_GROWTH,
  SOFT_EDGE,
  VEIL_OPACITIES,
  VEIL_STROKE,
  veilEdge,
  veilRadius,
} from "./launch-growth";

const OPAQUE = VEIL_OPACITIES.length - 1;

describe("launch growth", () => {
  it("reaches every corner of the drawing from the foot of the trunk", () => {
    for (const [x, y] of [
      [0, 0],
      [BAOBAB_SIZE, 0],
      [0, BAOBAB_SIZE],
      [BAOBAB_SIZE, BAOBAB_SIZE],
    ] as const) {
      expect(Math.hypot(x - BAOBAB_FOOT.x, y - BAOBAB_FOOT.y)).toBeLessThanOrEqual(FULL_GROWTH);
    }
  });

  it("hides the whole tree before it grows", () => {
    expect(VEIL_OPACITIES[OPAQUE]).toBe(1);
    expect(veilEdge(0, OPAQUE)).toBeLessThanOrEqual(0);
  });

  it("shows the whole tree once grown, soft edge included", () => {
    VEIL_OPACITIES.forEach((_, index) => {
      expect(veilEdge(1, index)).toBeGreaterThanOrEqual(FULL_GROWTH);
    });
  });

  it("thickens the cover evenly across the soft edge", () => {
    let shown = 1;
    VEIL_OPACITIES.forEach((opacity, index) => {
      shown *= 1 - opacity;
      expect(1 - shown).toBeCloseTo((index + 1) / VEIL_OPACITIES.length);
    });
  });

  it("keeps the lighter veils ahead of the opaque one, a soft edge apart", () => {
    expect(veilEdge(0.5, OPAQUE) - veilEdge(0.5, 0)).toBeCloseTo(SOFT_EDGE);
    expect(veilEdge(0.5, 1)).toBeLessThan(veilEdge(0.5, OPAQUE));
  });

  it("grows steadily, and its rings always cover out to the corners", () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      VEIL_OPACITIES.forEach((_, index) => {
        const radius = veilRadius(progress, index);
        expect(radius).toBeGreaterThan(0);
        expect(radius + VEIL_STROKE / 2).toBeGreaterThanOrEqual(FULL_GROWTH);
      });
    }
    expect(veilEdge(0.6, 0)).toBeGreaterThan(veilEdge(0.4, 0));
  });
});
