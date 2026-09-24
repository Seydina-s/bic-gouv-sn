import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA } from "../color/contrast";
import { darkColors, lightColors, type SemanticColors } from "./colors";
import { palette } from "./palette";

type Pair = [foreground: keyof SemanticColors, background: keyof SemanticColors, min: number];

/** Every foreground/background combination the UI is allowed to use. */
const REQUIRED_PAIRS: Pair[] = [
  ["textPrimary", "background", WCAG_AA.text],
  ["textPrimary", "surface", WCAG_AA.text],
  ["textPrimary", "surfaceRaised", WCAG_AA.text],
  ["textSecondary", "background", WCAG_AA.text],
  ["textSecondary", "surface", WCAG_AA.text],
  ["textSecondary", "surfaceRaised", WCAG_AA.text],
  ["textBrand", "background", WCAG_AA.text],
  ["textBrand", "surface", WCAG_AA.text],
  ["onPrimary", "primary", WCAG_AA.text],
  ["onPrimary", "primaryPressed", WCAG_AA.text],
  ["onBrandSurface", "brandSurface", WCAG_AA.text],
  ["onAccent", "accent", WCAG_AA.text],
  ["danger", "background", WCAG_AA.text],
  ["onDanger", "danger", WCAG_AA.text],
  ["onDangerSurface", "dangerSurface", WCAG_AA.text],
  ["accentOnBrandSurface", "brandSurface", WCAG_AA.largeText],
  ["primary", "background", WCAG_AA.uiComponent],
  ["borderStrong", "background", WCAG_AA.uiComponent],
  ["borderStrong", "surface", WCAG_AA.uiComponent],
  ["focusRing", "background", WCAG_AA.uiComponent],
  ["focusRing", "surface", WCAG_AA.uiComponent],
];

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
] as const)("%s theme", (_scheme, colors) => {
  it.each(REQUIRED_PAIRS)("%s on %s meets WCAG AA (≥ %s:1)", (foreground, background, min) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(min);
  });

  it("only uses colors from the palette", () => {
    const paletteColors = new Set(Object.values(palette).flatMap((scale) => Object.values(scale)));
    for (const value of Object.values(colors)) {
      expect(paletteColors).toContain(value);
    }
  });
});

describe("charter rules", () => {
  it("never uses yellow as a text color on the light background", () => {
    const yellows = new Set<string>(Object.values(palette.yellow));
    const textTokens = [lightColors.textPrimary, lightColors.textSecondary, lightColors.textBrand];
    expect(textTokens.some((color) => yellows.has(color))).toBe(false);
  });

  it("keeps white as the default light background", () => {
    expect(lightColors.background).toBe("#FFFFFF");
  });
});
