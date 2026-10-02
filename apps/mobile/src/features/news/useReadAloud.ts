import * as Speech from "expo-speech";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export type ReadAloudStatus = "idle" | "playing" | "paused";

/** Where the voice is: which piece, and from which character of it. */
interface Position {
  piece: number;
  char: number;
}

/**
 * Reads pieces of text aloud one after the other with the phone's own voice (free,
 * offline, nothing leaves the phone). Pauses and resumes at the word it reached:
 * the voice reports each word it starts (the phone has no pause of its own on
 * Android), so a resumed reading picks up from that word. Silenced when the screen
 * loses focus or closes. Interim voice until the dedicated FR / WO voices (P2).
 */
export function useReadAloud(language: string) {
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  // Incremented on every start, pause and stop: callbacks of an older reading are ignored.
  const run = useRef(0);
  const reading = useRef<{ pieces: readonly string[]; at: Position } | null>(null);
  const focused = useIsFocused();

  const speakFrom = useCallback(
    (pieces: readonly string[], from: Position) => {
      run.current += 1;
      const current = run.current;
      const isCurrent = () => run.current === current;
      const finish = () => {
        if (isCurrent()) {
          reading.current = null;
          setStatus("idle");
        }
      };
      const speakPiece = (index: number, char: number) => {
        const piece = pieces[index];
        if (piece === undefined || !isCurrent()) {
          finish();
          return;
        }
        reading.current = { pieces, at: { piece: index, char } };
        Speech.speak(piece.slice(char), {
          language,
          onBoundary: ({ charIndex }: { charIndex: number }) => {
            if (isCurrent()) {
              reading.current = { pieces, at: { piece: index, char: char + charIndex } };
            }
          },
          onDone: () => {
            speakPiece(index + 1, 0);
          },
          // Also fired when the screen stops the voice on leaving (see below).
          onStopped: finish,
          onError: finish,
        });
      };
      void Speech.stop();
      setStatus("playing");
      speakPiece(from.piece, from.char);
    },
    [language],
  );

  const start = useCallback(
    (pieces: readonly string[]) => {
      speakFrom(pieces, { piece: 0, char: 0 });
    },
    [speakFrom],
  );

  const pause = useCallback(() => {
    run.current += 1;
    setStatus(reading.current === null ? "idle" : "paused");
    void Speech.stop();
  }, []);

  const resume = useCallback(() => {
    const paused = reading.current;
    if (paused !== null) {
      speakFrom(paused.pieces, paused.at);
    }
  }, [speakFrom]);

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

  return { status, start, pause, resume };
}

export type ReadAloud = ReturnType<typeof useReadAloud>;
