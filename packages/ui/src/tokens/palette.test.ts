import { describe, expect, it } from "vitest";
import { relativeLuminance } from "../color/contrast";
import { CHARTER_COLORS, palette } from "./palette";

describe("palette", () => {
  it("contains the exact charter colors", () => {
    expect(CHARTER_COLORS).toEqual({
      green: "#00853F",
      yellow: "#FDEF42",
      red: "#E31B23",
      white: "#FFFFFF",
    });
  });

  it.each(Object.entries(palette))("%s scale gets darker at every step", (_name, scale) => {
    const luminances = Object.entries(scale)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, hex]) => relativeLuminance(hex));
    for (let i = 1; i < luminances.length; i += 1) {
      expect(luminances[i]).toBeLessThan(luminances[i - 1] ?? Number.POSITIVE_INFINITY);
    }
  });

  it.each(["green", "yellow", "red"] as const)("%s scale covers steps 50 to 900", (name) => {
    expect(Object.keys(palette[name]).map(Number)).toEqual([
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
    ]);
  });
});
