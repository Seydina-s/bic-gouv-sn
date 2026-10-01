import { requireOptionalNativeModule } from "expo";
import type * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * The photo picker needs a native module that test builds made before Participer
 * do not have, and fails as soon as it is evaluated there: it is required only
 * where it exists (and always on the web).
 */
export function imagePickerAvailable(): boolean {
  return Platform.OS === "web" || requireOptionalNativeModule("ExponentImagePicker") !== null;
}

export function loadImagePicker(): typeof ImagePicker {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  return require("expo-image-picker") as typeof ImagePicker;
}
