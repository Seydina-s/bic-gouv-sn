import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA } from "../color/contrast";
import { darkColors, lightColors } from "./colors";
import { darkServiceTones, lightServiceTones, MAP_LAND } from "./service-tones";

describe("service tones", () => {
  it.each(Object.entries(lightServiceTones))(
    "%s: a white icon reads on its marker, and the marker on the map",
    (_kind, tone) => {
      expect(contrastRatio("#FFFFFF", tone.marker)).toBeGreaterThanOrEqual(WCAG_AA.text);
      expect(contrastRatio(tone.marker, MAP_LAND)).toBeGreaterThanOrEqual(WCAG_AA.uiComponent);
    },
  );

  it.each([
    ["light", lightServiceTones, lightColors],
    ["dark", darkServiceTones, darkColors],
  ] as const)("%s badges stay readable on every surface", (_scheme, tones, colors) => {
    for (const tone of Object.values(tones)) {
      expect(contrastRatio(tone.ink, tone.container)).toBeGreaterThanOrEqual(WCAG_AA.text);
      for (const surface of [colors.background, colors.surface, colors.surfaceRaised]) {
        expect(contrastRatio(tone.ink, surface)).toBeGreaterThanOrEqual(WCAG_AA.uiComponent);
      }
    }
  });

  it("gives every kind a tone of its own", () => {
    const markers = Object.values(lightServiceTones).map((tone) => tone.marker);
    expect(new Set(markers).size).toBe(markers.length);
    expect(Object.keys(darkServiceTones)).toEqual(Object.keys(lightServiceTones));
  });
});
