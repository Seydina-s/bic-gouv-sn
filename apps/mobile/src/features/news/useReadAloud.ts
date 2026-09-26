import * as Speech from "expo-speech";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reads pieces of text aloud one after the other with the phone's own voice (free,
 * offline, nothing leaves the phone). Stops when asked, when the screen loses focus
 * and when it closes. Interim voice until the dedicated FR / WO voices (P2).
 */
export function useReadAloud(language: string) {
  const [speaking, setSpeaking] = useState(false);
  // Incremented on every start and stop: callbacks of an older reading are ignored.
  const run = useRef(0);
  const focused = useIsFocused();

  const stop = useCallback(() => {
    run.current += 1;
    setSpeaking(false);
    void Speech.stop();
  }, []);

  const start = useCallback(
    (pieces: readonly string[]) => {
      void Speech.stop();
      run.current += 1;
      const current = run.current;
      const speakFrom = (index: number) => {
        const piece = pieces[index];
        if (piece === undefined || run.current !== current) {
          if (run.current === current) {
            setSpeaking(false);
          }
          return;
        }
        Speech.speak(piece, {
          language,
          onDone: () => {
            speakFrom(index + 1);
          },
          // Also fired when the screen stops the voice on leaving (see below).
          onStopped: () => {
            if (run.current === current) {
              setSpeaking(false);
            }
          },
          onError: () => {
            if (run.current === current) {
              setSpeaking(false);
            }
          },
        });
      };
      setSpeaking(true);
      speakFrom(0);
    },
    [language],
  );

  // Leaving the screen (focus lost or closed) silences the voice; the "stopped"
  // callback of the current reading then resets the button.
  useEffect(() => {
    if (!focused) {
      return;
    }
    return () => {
      void Speech.stop();
    };
  }, [focused]);

  return { speaking, start, stop };
}
