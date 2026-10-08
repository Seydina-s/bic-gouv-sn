import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * The recorded voices are played by expo-audio. Only required through
 * load-audio-player.ts: builds made before it was added do not have its native
 * module and fail as soon as it is evaluated.
 */
export async function openRecording(url: string): Promise<AudioPlayer> {
  // Heard even with the phone on silent, and on with the screen off (CLAUDE.md §1).
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  });
  return createAudioPlayer({ uri: url });
}

export type { AudioPlayer };
