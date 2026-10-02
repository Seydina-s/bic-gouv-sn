import { BAOBAB_FOOT, BAOBAB_SIZE } from "../../components/baobab-drawing";

/**
 * The launch baobab grows out of the foot of its trunk: veils the colour of the
 * screen cover what has not grown yet, each a ring whose inner edge widens with
 * the progress. Lighter veils run ahead of the opaque one, so the growing edge is
 * soft. Run backwards, the tree withdraws into its foot, leaves first.
 */

/** From the foot of the trunk, the farthest corner of the drawing. */
export const FULL_GROWTH = Math.hypot(
  Math.max(BAOBAB_FOOT.x, BAOBAB_SIZE - BAOBAB_FOOT.x),
  BAOBAB_FOOT.y,
);

/** How soft the growing edge is, in drawing units. */
export const SOFT_EDGE = 120;

/** Enough veils for the soft edge to read as a gradient, not as bands. */
const VEIL_COUNT = 8;

/**
 * The veils, from the innermost (lightest, ahead) to the opaque one: veil `i`
 * covers 1 / (count − i) of what shows through it, so the cover grows evenly
 * from none to full across the soft edge.
 */
export const VEIL_OPACITIES: readonly number[] = Array.from(
  { length: VEIL_COUNT },
  (_, index) => 1 / (VEIL_COUNT - index),
);

/** Wide enough for a ring to cover the whole drawing, whatever its inner edge. */
export const VEIL_STROKE = 2 * (FULL_GROWTH + SOFT_EDGE);

/** Where veil `index` starts covering, from the foot, at `progress` (0 to 1). */
export function veilEdge(progress: number, index: number): number {
  "worklet";
  const step = SOFT_EDGE / (VEIL_OPACITIES.length - 1);
  return progress * (FULL_GROWTH + SOFT_EDGE) - SOFT_EDGE + index * step;
}

/** The radius of veil `index`'s ring: its stroke, centred on it, starts at its edge. */
export function veilRadius(progress: number, index: number): number {
  "worklet";
  return veilEdge(progress, index) + VEIL_STROKE / 2;
}
