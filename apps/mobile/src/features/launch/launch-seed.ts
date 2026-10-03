import { STAR_START_SCALE } from "./native-splash";

/*
 * The "seed" launch (direction C, owner's choice, 03/10/2026): the star of the
 * official icon lights up alone, the three bands grow out of it and the app's name
 * appears below; the icon stays, then folds back into the star, which drops to the
 * ground like a seed; the baobab grows out of it, withdraws, and the app appears.
 * Everything is a function of one clock, in milliseconds, so the whole launch runs
 * on the UI thread and can be tested here.
 */

export type Window = readonly [number, number];

/** Durations, from the motion tokens. */
export interface LaunchDurations {
  /** The icon on screen, from the star lighting up to the fold. */
  launchIcon: number;
  /** The fold into the star and the seed's fall. */
  launchSeed: number;
  launchDraw: number;
  launchHold: number;
  launchUndraw: number;
  launchFade: number;
}

/** When each part of the launch happens. */
export interface LaunchSchedule {
  fold: Window;
  nameOut: Window;
  fall: Window;
  grow: Window;
  undraw: Window;
  fade: Window;
  end: number;
}

/** The star lights up and settles; the ring of light around it. */
const STAR_PULSE = 250;
const STAR_SETTLE: Window = [250, 900];
const RING: Window = [150, 750];
/** Each band grows out of the star, a little after the previous one. */
const BAND_START = 350;
const BAND_STAGGER = 120;
const BAND_GROWTH = 600;
const NAME_IN: Window = [800, 1300];
/** The star's highest scale while it lights up. */
const STAR_PEAK = 1.9;
/** The star turns by one point (72°): it ends as it began. */
const STAR_TURN = 72;

export function launchSchedule(d: LaunchDurations): LaunchSchedule {
  const fold: Window = [d.launchIcon, d.launchIcon + d.launchSeed * 0.6];
  const fall: Window = [d.launchIcon + d.launchSeed * 0.5, d.launchIcon + d.launchSeed];
  const grow: Window = [fall[1], fall[1] + d.launchDraw];
  const undrawStart = grow[1] + d.launchHold;
  const undraw: Window = [undrawStart, undrawStart + d.launchUndraw];
  const fadeStart = undrawStart + d.launchUndraw * 0.7;
  const fade: Window = [fadeStart, fadeStart + d.launchFade];
  return {
    fold,
    nameOut: [d.launchIcon, d.launchIcon + d.launchSeed * 0.4],
    fall,
    grow,
    undraw,
    fade,
    end: fade[1],
  };
}

export function phase(t: number, [start, end]: Window): number {
  "worklet";
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}

function mix(from: number, to: number, p: number): number {
  "worklet";
  return from + (to - from) * p;
}

export function easeOut(p: number): number {
  "worklet";
  return 1 - (1 - p) ** 3;
}

export function easeIn(p: number): number {
  "worklet";
  return p ** 3;
}

export function easeInOut(p: number): number {
  "worklet";
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
}

/** Overshoots a little before settling, as something that springs open. */
export function backOut(p: number): number {
  "worklet";
  const c = 1.70158;
  return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
}

/** The star's scale: from its size on the phone's launch screen, a pulse, then the icon's. */
export function starScale(t: number): number {
  "worklet";
  if (t < STAR_PULSE) {
    return mix(STAR_START_SCALE, STAR_PEAK, easeOut(t / STAR_PULSE));
  }
  return mix(STAR_PEAK, 1, easeInOut(phase(t, STAR_SETTLE)));
}

export function starTurn(t: number): number {
  "worklet";
  return STAR_TURN * easeInOut(phase(t, [0, STAR_SETTLE[1]]));
}

/** The ring of light: how far it has spread (0 to 1); it fades as it spreads. */
export function ringSpread(t: number): number {
  "worklet";
  return phase(t, RING);
}

/** How far band `index` has grown out of the star (0 to about 1.1, then 1). */
export function bandGrowth(t: number, index: number): number {
  "worklet";
  const start = BAND_START + index * BAND_STAGGER;
  return backOut(phase(t, [start, start + BAND_GROWTH]));
}

/** The name under the icon: how present it is (0 to 1). */
export function namePresence(t: number, schedule: LaunchSchedule): number {
  "worklet";
  return easeOut(phase(t, NAME_IN)) * (1 - phase(t, schedule.nameOut));
}

/** How far the icon has folded back into its star (0 to 1). */
export function foldProgress(t: number, schedule: LaunchSchedule): number {
  "worklet";
  return easeInOut(phase(t, schedule.fold));
}

/** How far the seed has fallen from the star to the ground (0 to 1). */
export function fallProgress(t: number, schedule: LaunchSchedule): number {
  "worklet";
  return easeIn(phase(t, schedule.fall));
}

/** The seed shows from the end of the fold until the tree has started to grow. */
export function seedPresence(t: number, schedule: LaunchSchedule): number {
  "worklet";
  const growing = schedule.grow[0];
  if (t < schedule.fold[1] - 60) {
    return 0;
  }
  return 1 - phase(t, [growing, growing + 200]);
}

/** How far the baobab has grown (0 to 1): up out of the seed, then back down. */
export function treeGrowth(t: number, schedule: LaunchSchedule): number {
  "worklet";
  return easeOut(phase(t, schedule.grow)) * (1 - easeIn(phase(t, schedule.undraw)));
}

/** The launch layer's opacity: it fades into the app at the end. */
export function layerOpacity(t: number, schedule: LaunchSchedule): number {
  "worklet";
  return 1 - phase(t, schedule.fade);
}
