import { motion } from "@bgs/ui";
import { STAR_START_SCALE } from "./native-splash";
import {
  backOut,
  bandGrowth,
  fallProgress,
  foldProgress,
  launchSchedule,
  layerOpacity,
  namePresence,
  seedPresence,
  starScale,
  starTurn,
  treeGrowth,
} from "./launch-seed";

const schedule = launchSchedule(motion.duration);
const { launchIcon } = motion.duration;

describe("the seed launch", () => {
  it("starts from the star the phone's launch screen showed, and ends where it began", () => {
    expect(starScale(0)).toBeCloseTo(STAR_START_SCALE);
    expect(starScale(1100)).toBeCloseTo(1);
    // A turn of one point: the star looks the same before and after.
    expect(starTurn(0)).toBe(0);
    expect(starTurn(1100) % 72).toBeCloseTo(0);
  });

  it("grows the three bands out of the star, one after the other", () => {
    expect(bandGrowth(0, 0)).toBeCloseTo(0);
    expect(bandGrowth(800, 0)).toBeGreaterThan(bandGrowth(800, 2));
    for (const band of [0, 1, 2]) {
      expect(bandGrowth(launchIcon, band)).toBeCloseTo(1);
    }
    // Springs open: a little past full size before settling.
    expect(Math.max(...[0.6, 0.7, 0.8].map(backOut))).toBeGreaterThan(1);
  });

  it("keeps the icon and its name 2.5 seconds, then folds it into the star", () => {
    expect(launchIcon).toBe(2500);
    expect(namePresence(2000, schedule)).toBeCloseTo(1);
    expect(foldProgress(launchIcon - 1, schedule)).toBe(0);
    expect(foldProgress(schedule.fold[1], schedule)).toBe(1);
    expect(namePresence(schedule.fold[1], schedule)).toBe(0);
  });

  it("drops the seed to the ground, then grows the tree out of it", () => {
    expect(seedPresence(1000, schedule)).toBe(0);
    expect(fallProgress(schedule.fall[1], schedule)).toBe(1);
    expect(seedPresence(schedule.fall[1], schedule)).toBe(1);
    expect(treeGrowth(schedule.fall[1], schedule)).toBe(0);
    expect(treeGrowth(schedule.grow[1], schedule)).toBe(1);
    expect(seedPresence(schedule.grow[1], schedule)).toBe(0);
  });

  it("takes the tree back and gives way to the app, within five and a half seconds", () => {
    expect(treeGrowth(schedule.undraw[1], schedule)).toBe(0);
    expect(layerOpacity(schedule.fade[0], schedule)).toBe(1);
    expect(layerOpacity(schedule.end, schedule)).toBe(0);
    expect(schedule.end).toBeLessThanOrEqual(5500);
  });
});
