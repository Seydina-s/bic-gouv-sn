/*
 * The official BIC-GOUV icon (supplied by the owner on 03/10/2026): the flag's
 * three bands, the middle one longer and carrying the star. Colours and shapes are
 * copied from the institution's own file (apps/mobile/assets/brand/icon-source.svg),
 * never redrawn; they are part of the mark, so they stay the same in both themes.
 */

/** The colours, as in the file. */
export const BRAND_MARK = {
  green: "#0C853F",
  yellow: "#FAEF31",
  red: "#E92925",
} as const;

/** The file's own drawing area. */
export const BRAND_MARK_WIDTH = 375.13;
export const BRAND_MARK_HEIGHT = 832.47;

export interface BrandBand {
  colour: keyof typeof BRAND_MARK;
  x: number;
  width: number;
  height: number;
}

/** Left to right; all three hang from the top edge. */
export const BRAND_BANDS: readonly BrandBand[] = [
  { colour: "green", x: 0, width: 53.2, height: 605.07 },
  { colour: "yellow", x: 157.99, width: 59.16, height: 832.47 },
  { colour: "red", x: 320.56, width: 54.57, height: 605.06 },
];

export const STAR_POINTS =
  "199.92 436.24 187.57 429.4 175.21 436.24 177.57 421.76 167.58 411.51 181.39 409.4 187.57 396.23 193.74 409.4 207.56 411.51 197.56 421.76 199.92 436.24";

/** Centre of the circle through the star's points: it turns on itself around it. */
export const STAR_CENTER = { x: 187.57, y: 418.34 } as const;

/** Radius of that circle, and the star's width point to point. */
export const STAR_RADIUS = 22.11;
export const STAR_WIDTH = 39.98;
