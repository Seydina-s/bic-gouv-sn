import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import type * as AudioPlayer from "./audio-player";

/**
 * Recordings can be played where the audio module exists: every build made since
 * the voices were added, and the web. Older test builds keep the phone's voice.
 */
export function recordingsPlayable(): boolean {
  return Platform.OS === "web" || requireOptionalNativeModule("ExpoAudio") !== null;
}

export function loadAudioPlayer(): typeof AudioPlayer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  return require("./audio-player") as typeof AudioPlayer;
}
