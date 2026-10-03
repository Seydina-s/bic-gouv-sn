import { darkColors, lightColors } from "@bgs/ui";
import appConfig from "../../../app.json";
import { NATIVE_SPLASH_IMAGE, NATIVE_SPLASH_IMAGE_WIDTH, NATIVE_STAR_SHARE } from "./native-splash";

interface SplashConfig {
  backgroundColor: string;
  image?: string;
  imageWidth?: number;
  dark: { backgroundColor: string; image?: string };
}

/**
 * The phone's own launch screen shows the icon's star alone on the app's
 * background in each theme; the launch animation starts from that same star.
 */
describe("native launch screen", () => {
  const plugin = appConfig.expo.plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === "expo-splash-screen",
  ) as [string, SplashConfig];

  it("has the app's background in each theme", () => {
    expect(plugin[1].backgroundColor.toUpperCase()).toBe(lightColors.background.toUpperCase());
    expect(plugin[1].dark.backgroundColor.toUpperCase()).toBe(darkColors.background.toUpperCase());
  });

  it("shows the star the launch animation starts from, at the same size", () => {
    expect(plugin[1].image).toBe(NATIVE_SPLASH_IMAGE);
    expect(plugin[1].dark.image).toBe(NATIVE_SPLASH_IMAGE);
    expect(plugin[1].imageWidth).toBe(NATIVE_SPLASH_IMAGE_WIDTH);
  });

  it("keeps the star well inside the circle Android cuts out of the image", () => {
    expect(NATIVE_STAR_SHARE).toBeGreaterThan(0.05);
    expect(NATIVE_STAR_SHARE).toBeLessThan(0.6);
  });
});
