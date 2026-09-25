import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("computes the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#00853F", "#FFFFFF")).toBe(contrastRatio("#FFFFFF", "#00853F"));
  });

  it("matches a known reference value", () => {
    // #767676 on white is the classic 4.54:1 AA threshold example.
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  it.each(["#FFF", "00853F", "#00853FCC", "green"])("rejects malformed color %s", (value) => {
    expect(() => relativeLuminance(value)).toThrow(/#RRGGBB/);
  });
});
