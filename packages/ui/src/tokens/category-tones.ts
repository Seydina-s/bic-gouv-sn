import { palette } from "./palette";

const { neutral } = palette;

/**
 * One tone per news section, so sections are told apart at a glance (user request,
 * 26/09/2026). Always paired with the section's woven pattern and name: color is
 * never the only cue. Earthy hues (indigo, laterite, Atlantic, ochre, bissap,
 * baobab bark) around the flag green; red stays reserved for alerts.
 * Generated once in OKLCH; contrast is checked in category-tones.test.ts.
 */
export interface CategoryTone {
  /** Tinted background: chips, card headers. */
  container: string;
  /** Text and icons, on the container and on every surface. */
  ink: string;
  /** Bars, dots and icons (UI components, 3:1). */
  solid: string;
}

export type CategoryTones = Record<string, CategoryTone> & { general: CategoryTone };

export const lightCategoryTones: CategoryTones = {
  "conseil-des-ministres": { container: "#E0F8E4", ink: "#04672D", solid: "#2D8949" },
  communiques: { container: "#EAF0FE", ink: "#345197", solid: "#5171BB" },
  discours: { container: "#FEECE4", ink: "#8C3701", solid: "#B1582B" },
  international: { container: "#DCF5FC", ink: "#056070", solid: "#058298" },
  focus: { container: "#FCEED7", ink: "#704E03", solid: "#976C07" },
  interviews: { container: "#FFE9F4", ink: "#823564", solid: "#A55584" },
  agenda: { container: "#FBEDE3", ink: "#724B2B", solid: "#936B4A" },
  general: { container: neutral[100], ink: neutral[700], solid: neutral[600] },
};

export const darkCategoryTones: CategoryTones = {
  "conseil-des-ministres": { container: "#12331B", ink: "#A6E2B2", solid: "#69C27E" },
  communiques: { container: "#1E2A46", ink: "#BBD1FF", solid: "#86A9F7" },
  discours: { container: "#432111", ink: "#FFC1A5", solid: "#EE8F63" },
  international: { container: "#093139", ink: "#9BDDEE", solid: "#54BBD2" },
  focus: { container: "#392806", ink: "#EECC92", solid: "#D2A249" },
  interviews: { container: "#3E2031", ink: "#FABBDE", solid: "#E08BBC" },
  agenda: { container: "#37281B", ink: "#EACAB1", solid: "#CCA17E" },
  general: { container: neutral[925], ink: neutral[300], solid: neutral[400] },
};

/** Tone of a section; unknown sections use the neutral one. */
export function categoryTone(tones: CategoryTones, category: string): CategoryTone {
  return tones[category] ?? tones.general;
}
