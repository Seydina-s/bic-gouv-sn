import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioPlayer } from "./audio-player";
import { loadAudioPlayer } from "./load-audio-player";
import type { ReadAloudStatus } from "./useReadAloud";

/**
 * Plays the recording of an article (our voices, read once on the server): pauses
 * and resumes where it was, keeps playing with the screen off or the app in the
 * background, and stops when the reader leaves the article, like the phone's voice.
 */
export function useRecordingPlayback(url: string | null) {
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  const player = useRef<AudioPlayer | null>(null);
  const focused = useIsFocused();

  const release = useCallback(() => {
    player.current?.remove();
    player.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (url === null) {
      return;
    }
    release();
    setStatus("playing");
    try {
      const opened = await loadAudioPlayer().openRecording(url);
      player.current = opened;
      opened.addListener("playbackStatusUpdate", (update) => {
        if (update.didJustFinish && player.current === opened) {
          release();
        }
      });
      opened.play();
    } catch {
      // Not reachable (offline): the button goes back to "Écouter".
      release();
    }
  }, [url, release]);

  const pause = useCallback(() => {
    player.current?.pause();
    setStatus(player.current === null ? "idle" : "paused");
  }, []);

  const resume = useCallback(() => {
    if (player.current === null) {
      void start();
      return;
    }
    player.current.play();
    setStatus("playing");
  }, [start]);

  // Leaving the article (focus lost or closed) stops the recording.
  useEffect(() => {
    if (!focused) {
      return;
    }
    return release;
  }, [focused, release]);

  return { status, start, pause, resume };
}
