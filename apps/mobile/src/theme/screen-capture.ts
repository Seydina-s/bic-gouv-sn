import { Platform, TurboModuleRegistry } from "react-native";
import type * as ViewShot from "./view-shot";

export interface ScreenCapture {
  /** A picture of the screen as it is now, saved in a temporary file. */
  take: () => Promise<string>;
  /** Deletes the temporary file once the picture is no longer shown. */
  release: (uri: string) => void;
}

/**
 * The capture module came with the Android build of 15/10/2026; older test builds and
 * the web keep the plain veil. Its package throws at import when the native module is
 * missing, so it is only loaded once the module is known to be there.
 */
export function loadScreenCapture(): ScreenCapture | null {
  if (Platform.OS === "web" || TurboModuleRegistry.get("RNViewShot") === null) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  const { captureScreen, releaseCapture } = require("./view-shot") as typeof ViewShot;
  return {
    take: () => captureScreen({ format: "jpg", quality: 0.9, result: "tmpfile" }),
    release: releaseCapture,
  };
}
