import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BRAND_BANDS,
  BRAND_MARK,
  BRAND_MARK_HEIGHT,
  BRAND_MARK_WIDTH,
  STAR_CENTER,
  STAR_POINTS,
  STAR_RADIUS,
  STAR_WIDTH,
} from "./brand-mark";

const SOURCE = new URL("../../../../apps/mobile/assets/brand/icon-source.svg", import.meta.url);
const svg = readFileSync(SOURCE, "utf8");
const points = STAR_POINTS.split(" ").map(Number);
const xs = points.filter((_, i) => i % 2 === 0);
const ys = points.filter((_, i) => i % 2 === 1);

describe("the official icon", () => {
  it("keeps the colours of the institution's own file", () => {
    for (const colour of Object.values(BRAND_MARK)) {
      expect(svg.toUpperCase()).toContain(colour);
    }
  });

  it("keeps its shapes, never redrawn", () => {
    expect(svg).toContain(`viewBox="0 0 ${String(BRAND_MARK_WIDTH)} ${String(BRAND_MARK_HEIGHT)}"`);
    expect(svg).toContain(STAR_POINTS);
    for (const band of BRAND_BANDS) {
      expect(svg).toContain(`width="${String(band.width)}" height="${String(band.height)}"`);
    }
  });

  it("turns the star around the centre of its points", () => {
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(STAR_WIDTH);
    xs.forEach((x, i) => {
      const distance = Math.hypot(x - STAR_CENTER.x, (ys[i] ?? 0) - STAR_CENTER.y);
      expect(distance).toBeLessThanOrEqual(STAR_RADIUS + 0.1);
    });
  });
});
