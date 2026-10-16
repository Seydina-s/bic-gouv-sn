import type { Lang } from "@bgs/shared-types";
import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "../player/PlayerProvider";
import { loadVoiceInput, voiceInputAvailable } from "./load-voice-input";

/** Why dictation could not start or went wrong, as the screen says it. */
export type VoiceProblem = "denied" | "unavailable" | "wolof" | "failed";

/**
 * The microphone of the composer: dictates a question in French or English into the
 * field, live. Wolof has no phone recognizer yet: the screen says so instead of guessing.
 * A reading under way is paused first, so that the two never share the sound.
 */
export function useVoiceInput(lang: Lang, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<VoiceProblem | null>(null);
  const player = usePlayer();
  const { pause } = player;
  const reading = player.status === "playing";

  const start = useCallback(async () => {
    setProblem(null);
    if (lang === "wo") {
      setProblem("wolof");
      return;
    }
    if (!voiceInputAvailable()) {
      setProblem("unavailable");
      return;
    }
    // The microphone never hears a reading under way: it is paused first (audit of
    // 15/10/2026), and can be resumed from the bar at the top.
    if (reading) {
      pause();
    }
    setListening(true);
    try {
      const outcome = await loadVoiceInput().listen(
        {
          onText: (text) => {
            onText(text);
          },
          onEnd: () => {
            setListening(false);
          },
          onError: (code) => {
            setListening(false);
            // Silence or a stop by the person are not problems.
            if (code !== "aborted" && code !== "no-speech") {
              setProblem("failed");
            }
          },
        },
        lang === "en" ? "en-US" : "fr-FR",
      );
      if (outcome !== "started") {
        setListening(false);
        setProblem(outcome);
      }
    } catch {
      setListening(false);
      setProblem("failed");
    }
  }, [lang, onText, reading, pause]);

  const stop = useCallback(() => {
    if (listening && voiceInputAvailable()) {
      loadVoiceInput().stopListening();
    }
    setListening(false);
  }, [listening]);

  // A notice about dictation fades after a while.
  useEffect(() => {
    if (problem === null) {
      return;
    }
    const timer = setTimeout(() => {
      setProblem(null);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [problem]);

  return { listening, problem, start, stop };
}
