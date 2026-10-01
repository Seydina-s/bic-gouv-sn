import { darkColors, lightColors } from "@bgs/ui";
import appConfig from "../../../app.json";

/**
 * The phone's own launch screen (shown before the app can draw) is plain, the
 * app's background in each theme: the baobab then draws itself with no jump.
 */
describe("native launch screen", () => {
  it("has the app's background in each theme, and no picture of its own", () => {
    const plugin = appConfig.expo.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === "expo-splash-screen",
    ) as [string, { backgroundColor: string; image?: string; dark: { backgroundColor: string } }];
    expect(plugin[1].backgroundColor.toUpperCase()).toBe(lightColors.background.toUpperCase());
    expect(plugin[1].dark.backgroundColor.toUpperCase()).toBe(darkColors.background.toUpperCase());
    expect(plugin[1].image).toBeUndefined();
  });
});
