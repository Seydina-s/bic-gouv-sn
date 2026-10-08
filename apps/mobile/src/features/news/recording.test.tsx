import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { DETAIL } from "../../testing/news-fixtures";
import { TestProviders } from "../../testing/TestProviders";
import { ArticleView } from "./ArticleView";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  maxSpeechInputLength: 4000,
}));

/** A fake of expo-audio's player: what it was asked, and its "finished" event. */
const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  finish: (): void => {
    // Replaced once the screen listens to the player.
  },
  addListener: jest.fn((_event: string, listener: (update: { didJustFinish: boolean }) => void) => {
    mockPlayer.finish = () => {
      listener({ didJustFinish: true });
    };
  }),
};
const mockOpenRecording = jest.fn<Promise<typeof mockPlayer>, [string]>(() =>
  Promise.resolve(mockPlayer),
);
jest.mock("./load-audio-player", () => ({
  recordingsPlayable: () => true,
  loadAudioPlayer: () => ({ openRecording: mockOpenRecording }),
}));

const RECORDING = { url: "https://media.test/audio/a/fr-1.mp3", durationMs: 60_000 };

const view = (detail: typeof DETAIL) =>
  render(
    <TestProviders>
      <ArticleView detail={detail} isPending={false} paneWidth={390} bottomInset={0} />
    </TestProviders>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the recorded voices", () => {
  it("play the article's recording, pause and resume it, never the phone's voice", async () => {
    await view({ ...DETAIL, audio: RECORDING });
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    expect(mockOpenRecording).toHaveBeenCalledWith(RECORDING.url);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(Speech.speak).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Pause" }));
    expect(mockPlayer.pause).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Reprendre" }));
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
    expect(mockOpenRecording).toHaveBeenCalledTimes(1);
    await act(() => {
      mockPlayer.finish();
    });
    expect(screen.getByRole("button", { name: "Écouter" })).toBeOnTheScreen();
  });

  it("read a Wolof article with its recording instead of saying the voice is coming", async () => {
    await view({ ...DETAIL, lang: "wo", audio: RECORDING });
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    expect(mockOpenRecording).toHaveBeenCalledWith(RECORDING.url);
    expect(screen.queryByRole("button", { name: "Voix wolof bientôt disponible" })).toBeNull();
  });

  it("leave the phone's voice for an article not recorded yet", async () => {
    await view({ ...DETAIL, audio: null });
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    expect(mockOpenRecording).not.toHaveBeenCalled();
    expect(Speech.speak).toHaveBeenCalled();
  });
});
