/**
 * How far one part of the launch drawing is (0 to 1) when the whole drawing is at
 * `progress`: each part has its own window of the timeline, and windows overlap so
 * the tree grows in one movement. Run backwards, it takes the tree back in reverse.
 */
export function phase(progress: number, [start, end]: readonly [number, number]): number {
  "worklet";
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/** The order of the launch: ground, trunk, limbs, then the crown up to the leaves. */
export const TIMELINE = {
  ground: [0, 0.16],
  trunkOutline: [0.04, 0.38],
  trunkFill: [0.28, 0.44],
  /** The six limbs start one after the other within this window. */
  limbs: [0.3, 0.66],
  /** The crown's levels (branches, twigs, finer twigs, leaf tufts) appear in turn. */
  crown: [0.56, 1],
} as const satisfies Record<string, readonly [number, number]>;

/** The window of item `index` of `count` within `window`, each a little after the last. */
export function staggered(
  [start, end]: readonly [number, number],
  index: number,
  count: number,
  share = 0.5,
): [number, number] {
  "worklet";
  const span = end - start;
  const own = span * share;
  const begin = count <= 1 ? start : start + ((span - own) * index) / (count - 1);
  return [begin, begin + own];
}

/** A shape fills in as its outline closes: the last part of its window, a little beyond. */
export function filledAfter([start, end]: readonly [number, number]): [number, number] {
  const span = end - start;
  return [start + span * 0.6, Math.min(1, end + span * 0.2)];
}
