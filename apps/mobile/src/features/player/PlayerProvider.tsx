import * as Speech from "expo-speech";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import type { AudioPlayer } from "../news/audio-player";
import { loadAudioPlayer } from "../news/load-audio-player";

export type ReadAloudStatus = "idle" | "playing" | "paused";

/** What is being read: its name, and the screen it is read from. */
export interface Reading {
  /** Unique among readings ("<article id>", "procedure:<slug>"). */
  id: string;
  title: string;
  /** The screen's address, to come back to it ("/article/…"). */
  path: string;
}

/** How a reading is heard: our recorded voices, or the phone's own voice. */
export type ReadingSource =
  | { kind: "recording"; url: string }
  | { kind: "voice"; language: string; pieces: readonly string[] };

export interface Player {
  /** The reading under way (playing or paused); null when nothing is read. */
  now: Reading | null;
  status: ReadAloudStatus;
  /** How much of the reading was heard, from 0 to 1. */
  progress: SharedValue<number>;
  play: (reading: Reading, source: ReadingSource) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/** Where the phone's voice is: which piece, and from which character of it. */
interface VoicePosition {
  piece: number;
  char: number;
}

const PlayerContext = createContext<Player | null>(null);

/** How smoothly the ring follows the reading between two reports. */
const GLIDE_MS = 250;

/**
 * The app's one reader (owner's request, 14/10/2026): an article or a procedure goes
 * on being read when the reader leaves it, shown by the bar pinned at the top, until
 * it ends or is stopped. Recordings keep playing with the screen off; the phone's
 * voice reads piece after piece and resumes at the word it reached.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Reading | null>(null);
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  const progress = useSharedValue(0);
  // Incremented whenever a reading starts, pauses or stops: older callbacks are ignored.
  const run = useRef(0);
  const recording = useRef<AudioPlayer | null>(null);
  const voice = useRef<{
    language: string;
    pieces: readonly string[];
    at: VoicePosition;
  } | null>(null);

  const silence = useCallback(() => {
    run.current += 1;
    void Speech.stop();
    recording.current?.remove();
    recording.current = null;
  }, []);

  const finish = useCallback(() => {
    silence();
    voice.current = null;
    setNow(null);
    setStatus("idle");
    progress.set(0);
  }, [silence, progress]);

  const heard = useCallback(
    (share: number) => {
      progress.set(withTiming(Math.min(1, Math.max(0, share)), { duration: GLIDE_MS }));
    },
    [progress],
  );

  const speakFrom = useCallback(
    (language: string, pieces: readonly string[], from: VoicePosition) => {
      silence();
      const current = run.current;
      const isCurrent = () => run.current === current;
      const speakPiece = (index: number, char: number) => {
        const piece = pieces[index];
        if (!isCurrent()) {
          return;
        }
        if (piece === undefined) {
          finish();
          return;
        }
        voice.current = { language, pieces, at: { piece: index, char } };
        heard((index + char / Math.max(1, piece.length)) / pieces.length);
        Speech.speak(piece.slice(char), {
          language,
          onBoundary: ({ charIndex }: { charIndex: number }) => {
            if (isCurrent()) {
              const at = { piece: index, char: char + charIndex };
              voice.current = { language, pieces, at };
              heard((index + at.char / Math.max(1, piece.length)) / pieces.length);
            }
          },
          onDone: () => {
            speakPiece(index + 1, 0);
          },
          onError: () => {
            if (isCurrent()) {
              finish();
            }
          },
        });
      };
      setStatus("playing");
      speakPiece(from.piece, from.char);
    },
    [silence, finish, heard],
  );

  const playRecording = useCallback(
    async (url: string) => {
      silence();
      const current = run.current;
      setStatus("playing");
      try {
        const opened = await loadAudioPlayer().openRecording(url);
        if (run.current !== current) {
          opened.remove();
          return;
        }
        recording.current = opened;
        opened.addListener("playbackStatusUpdate", (update) => {
          if (recording.current !== opened) {
            return;
          }
          if (update.didJustFinish) {
            finish();
          } else if (update.duration > 0) {
            heard(update.currentTime / update.duration);
          }
        });
        opened.play();
      } catch {
        // Not reachable (offline): nothing is read.
        if (run.current === current) {
          finish();
        }
      }
    },
    [silence, finish, heard],
  );

  const play = useCallback(
    (reading: Reading, source: ReadingSource) => {
      voice.current = null;
      progress.set(0);
      setNow(reading);
      if (source.kind === "recording") {
        void playRecording(source.url);
      } else {
        speakFrom(source.language, source.pieces, { piece: 0, char: 0 });
      }
    },
    [playRecording, speakFrom, progress],
  );

  const pause = useCallback(() => {
    if (recording.current !== null) {
      recording.current.pause();
    } else {
      // The phone has no pause of its own on Android: stopped, resumed at the word.
      run.current += 1;
      void Speech.stop();
    }
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (recording.current !== null) {
      recording.current.play();
      setStatus("playing");
      return;
    }
    const paused = voice.current;
    if (paused !== null) {
      speakFrom(paused.language, paused.pieces, paused.at);
    }
  }, [speakFrom]);

  const player = useMemo(
    () => ({ now, status, progress, play, pause, resume, stop: finish }),
    [now, status, progress, play, pause, resume, finish],
  );
  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (player === null) {
    throw new Error("usePlayer is used outside PlayerProvider");
  }
  return player;
}
