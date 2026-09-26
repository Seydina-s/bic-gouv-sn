import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA } from "../color/contrast";
import { darkCategoryTones, lightCategoryTones, categoryTone } from "./category-tones";
import { darkColors, lightColors } from "./colors";

describe.each([
  ["light", lightCategoryTones, lightColors],
  ["dark", darkCategoryTones, darkColors],
] as const)("%s section tones", (_scheme, tones, colors) => {
  it.each(Object.entries(tones))("%s stays readable everywhere it is used", (_name, tone) => {
    expect(contrastRatio(tone.ink, tone.container)).toBeGreaterThanOrEqual(WCAG_AA.text);
    for (const surface of [colors.background, colors.surface, colors.surfaceRaised]) {
      expect(contrastRatio(tone.ink, surface)).toBeGreaterThanOrEqual(WCAG_AA.text);
      expect(contrastRatio(tone.solid, surface)).toBeGreaterThanOrEqual(WCAG_AA.uiComponent);
    }
  });

  it("gives unknown sections the neutral tone", () => {
    expect(categoryTone(tones, "rubrique-inconnue")).toBe(tones.general);
  });
});
