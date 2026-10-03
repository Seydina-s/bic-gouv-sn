/**
 * The phone's own launch screen (shown before the app can draw): the official
 * icon on the app's background (owner's decision, 03/10/2026). The launch
 * animation starts from the same icon at the same size, so the hand-over shows
 * no jump. Kept in step with app.json (imageWidth) and scripts/app-icons.ts (the
 * icon is 520 pixels tall in splash-icon.png's 1024 square).
 */
export const NATIVE_SPLASH_IMAGE = "./assets/splash-icon.png";
export const NATIVE_SPLASH_IMAGE_WIDTH = 200;
const MARK_SHARE_OF_IMAGE = 520 / 1024;

/** How tall the icon stands on the launch screen, in points. */
export const NATIVE_SPLASH_MARK_HEIGHT = NATIVE_SPLASH_IMAGE_WIDTH * MARK_SHARE_OF_IMAGE;
