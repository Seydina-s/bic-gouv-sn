/**
 * Long enough to cover every stroke of the baobab (the longest is under 90 units
 * of its 120-unit drawing): hidden at the start, whole at the end.
 */
export const STROKE_DASH = 120;

/** Each stroke starts a little after the previous one; this share of the time is its own. */
const STROKE_SHARE = 0.35;

/**
 * How much of stroke `index` (of `count`) is drawn when the whole drawing is at
 * `progress` (0 to 1): strokes start one after the other and overlap.
 */
export function strokeProgress(progress: number, index: number, count: number): number {
  "worklet";
  const start = count <= 1 ? 0 : (index / (count - 1)) * (1 - STROKE_SHARE);
  return Math.min(1, Math.max(0, (progress - start) / STROKE_SHARE));
}
