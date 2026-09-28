import manifest from "../../../package.json";
import { OPEN_SOURCE } from "./open-source";

/**
 * Dependencies never shipped in the app's production bundle: the development build's
 * launcher, and the web renderer (the app is Android and iOS).
 */
const NOT_SHIPPED = new Set(["expo-dev-client", "react-dom", "react-native-web"]);

describe("open-source notices", () => {
  it("credit every dependency the app ships: run pnpm notices after adding one", () => {
    const credited = new Set(OPEN_SOURCE.packages.map((item) => item.name));
    const missing = Object.keys(manifest.dependencies).filter(
      (name) => !name.startsWith("@bgs/") && !NOT_SHIPPED.has(name) && !credited.has(name),
    );
    expect(missing).toEqual([]);
  });

  it("give each package a licence and its full text", () => {
    for (const item of OPEN_SOURCE.packages) {
      expect(item.licence).not.toBe("");
      expect(OPEN_SOURCE.texts[item.text]?.length ?? 0).toBeGreaterThan(100);
    }
  });
});
