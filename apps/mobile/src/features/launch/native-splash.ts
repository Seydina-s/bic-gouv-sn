import { BRAND_MARK_HEIGHT, STAR_WIDTH } from "@bgs/ui";

/**
 * The phone's own launch screen (shown before the app can draw): the star of the
 * official icon alone, on the app's background (owner's choice of the "seed"
 * launch, 03/10/2026). The launch animation starts from that same star, at the
 * same place and size, so the hand-over shows no jump. Kept in step with app.json
 * (image, imageWidth) and scripts/app-icons.ts, which draws the image from here.
 */
export const NATIVE_SPLASH_IMAGE = "./assets/splash-icon.png";
export const NATIVE_SPLASH_IMAGE_WIDTH = 200;

/** The icon's height on the launch screen, in points: large, as an app's launch logo. */
export const LAUNCH_MARK_HEIGHT = 220;

/** The star starts larger than in the icon, then settles. */
export const STAR_START_SCALE = 1.6;

/** The star's width on the native launch image, as a share of the image's width. */
export const NATIVE_STAR_SHARE =
  (STAR_WIDTH * (LAUNCH_MARK_HEIGHT / BRAND_MARK_HEIGHT) * STAR_START_SCALE) /
  NATIVE_SPLASH_IMAGE_WIDTH;
