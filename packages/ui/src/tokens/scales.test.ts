import { describe, expect, it } from "vitest";
import { motion, space, textStyle, windowClass } from "./scales";

describe("textStyle", () => {
  const roles = Object.entries(textStyle);

  it.each(roles)("%s leaves room for diacritics (line height ≥ 1.25 × size)", (_role, style) => {
    expect(style.lineHeight / style.fontSize).toBeGreaterThanOrEqual(1.25);
    expect(Number.isInteger(style.lineHeight)).toBe(true);
  });

  it("keeps reading text at 16 sp and nothing below 12 sp", () => {
    expect(textStyle.body.fontSize).toBe(16);
    expect(Math.min(...roles.map(([, style]) => style.fontSize))).toBe(12);
  });

  it("orders roles from largest to smallest", () => {
    const sizes = roles.map(([, style]) => style.fontSize);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });
});

describe("space", () => {
  it("follows the 4 dp rhythm above 2 dp", () => {
    const values = Object.values(space).filter((value) => value > 2);
    expect(values.every((value) => value % 4 === 0)).toBe(true);
  });
});

describe("motion", () => {
  it("makes exits faster than enters", () => {
    expect(motion.duration.exitFast).toBeLessThan(motion.duration.fast);
    expect(motion.duration.exitNormal).toBeLessThan(motion.duration.normal);
  });
});

describe("windowClass", () => {
  it.each([
    [360, "compact"],
    [599, "compact"],
    [600, "medium"],
    [839, "medium"],
    [840, "expanded"],
    [1280, "expanded"],
  ] as const)("%s dp → %s", (width, expected) => {
    expect(windowClass(width)).toBe(expected);
  });
});
