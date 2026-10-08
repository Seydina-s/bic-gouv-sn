import type { Lang } from "@bgs/shared-types";
import { useCallback, useEffect, useState } from "react";
import { loadVoiceInput, voiceInputAvailable } from "./load-voice-input";

/** Why dictation could not start or went wrong, as the screen says it. */
export type VoiceProblem = "denied" | "unavailable" | "wolof" | "failed";

/**
 * The microphone of the composer: dictates a question in French into the field,
 * live. Wolof has no phone recognizer yet: the screen says so instead of guessing.
 */
export function useVoiceInput(lang: Lang, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<VoiceProblem | null>(null);

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
    setListening(true);
    try {
      const outcome = await loadVoiceInput().listen({
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
      });
      if (outcome !== "started") {
        setListening(false);
        setProblem(outcome);
      }
    } catch {
      setListening(false);
      setProblem("failed");
    }
  }, [lang, onText]);

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
