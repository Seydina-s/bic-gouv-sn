/**
 * The welcome path (direction A, chosen by the user on 01/10/2026): a winding road
 * climbing from one station to the next, in a 390 × 400 drawing scaled to the
 * screen. Each step reached draws the road up to its station.
 */
export const PATH_BOX = { width: 390, height: 400 } as const;

interface Point {
  x: number;
  y: number;
}

/** One cubic curve of the road, from a station to the next. */
interface Leg {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

const START: Point = { x: 110, y: 340 };

const LEGS: readonly Leg[] = [
  { from: START, c1: { x: 110, y: 290 }, c2: { x: 280, y: 300 }, to: { x: 280, y: 250 } },
  {
    from: { x: 280, y: 250 },
    c1: { x: 280, y: 200 },
    c2: { x: 110, y: 200 },
    to: { x: 110, y: 160 },
  },
  {
    from: { x: 110, y: 160 },
    c1: { x: 110, y: 120 },
    c2: { x: 280, y: 110 },
    to: { x: 280, y: 70 },
  },
];

/** The stations, bottom first: where each step of the welcome sits on the road. */
export const STATIONS: readonly Point[] = [START, ...LEGS.map((leg) => leg.to)];

/** The road as SVG path data. */
export const ROAD = [
  `M${String(START.x)} ${String(START.y)}`,
  ...LEGS.map(
    ({ c1, c2, to }) =>
      `C ${String(c1.x)} ${String(c1.y)}, ${String(c2.x)} ${String(c2.y)}, ${String(to.x)} ${String(to.y)}`,
  ),
].join(" ");

function at(leg: Leg, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * leg.from.x + b * leg.c1.x + c * leg.c2.x + d * leg.to.x,
    y: a * leg.from.y + b * leg.c1.y + c * leg.c2.y + d * leg.to.y,
  };
}

/** Length of one curve, measured along many short chords (precise to a fraction of a point). */
export function legLength(leg: Leg, samples = 400): number {
  let length = 0;
  let previous = leg.from;
  for (let step = 1; step <= samples; step += 1) {
    const next = at(leg, step / samples);
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
  }
  return length;
}

const LENGTHS = LEGS.map((leg) => legLength(leg));

/** The whole road's length, in drawing units. */
export const ROAD_LENGTH = LENGTHS.reduce((sum, length) => sum + length, 0);

/** How much of the road is still undrawn once station `index` is reached. */
export function undrawnAt(index: number): number {
  const drawn = LENGTHS.slice(0, Math.max(0, index)).reduce((sum, length) => sum + length, 0);
  return Math.max(0, ROAD_LENGTH - drawn);
}

/** The drawing fitted in a box: its scale and where it starts, centred. */
export function fit(width: number, height: number) {
  const scale = Math.min(width / PATH_BOX.width, height / PATH_BOX.height);
  return {
    scale,
    left: (width - PATH_BOX.width * scale) / 2,
    top: (height - PATH_BOX.height * scale) / 2,
  };
}
