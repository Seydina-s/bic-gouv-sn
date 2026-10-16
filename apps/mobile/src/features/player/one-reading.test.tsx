import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { Pressable, Text } from "react-native";
import { PlayerProvider, usePlayer, type ReadingSource } from "./PlayerProvider";

/** What happened to the sound, in order: the proof that two readings never overlap. */
const mockEvents: string[] = [];

jest.mock("expo-speech", () => ({
  speak: jest.fn((text: string) => {
    mockEvents.push(`voice speaks ${text}`);
  }),
  stop: jest.fn(() => {
    mockEvents.push("voice stops");
    return Promise.resolve();
  }),
  maxSpeechInputLength: 4000,
}));

jest.mock("../news/load-audio-player", () => ({
  recordingsPlayable: () => true,
  loadAudioPlayer: () => ({
    openRecording: (url: string) =>
      Promise.resolve({
        play: () => mockEvents.push(`${url} plays`),
        pause: () => mockEvents.push(`${url} pauses`),
        remove: () => mockEvents.push(`${url} released`),
        addListener: () => undefined,
      }),
  }),
}));

const SOURCES: Record<string, ReadingSource> = {
  A: { kind: "recording", url: "a.mp3" },
  B: { kind: "recording", url: "b.mp3" },
  C: { kind: "voice", language: "fr-FR", pieces: ["Texte fictif C"] },
};

/** One button per article, as on their screens. */
function Articles() {
  const player = usePlayer();
  return Object.entries(SOURCES).map(([id, source]) => (
    <Pressable
      key={id}
      accessibilityRole="button"
      onPress={() => {
        player.play({ id, title: `Article ${id}`, path: `/article/${id}` }, source);
      }}
    >
      <Text>{`Écouter ${id}`}</Text>
    </Pressable>
  ));
}

async function listen(id: string) {
  await act(async () => {
    await fireEvent.press(screen.getByRole("button", { name: `Écouter ${id}` }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockEvents.length = 0;
  jest.clearAllMocks();
});

describe("one reading at a time (owner's report, 15/10/2026)", () => {
  it("stops a recording at once when another article is listened to", async () => {
    await render(
      <PlayerProvider>
        <Articles />
      </PlayerProvider>,
    );
    await listen("A");
    await listen("B");
    const aStops = mockEvents.indexOf("a.mp3 pauses");
    expect(aStops).toBeGreaterThan(mockEvents.indexOf("a.mp3 plays"));
    expect(mockEvents.indexOf("a.mp3 released")).toBeGreaterThan(aStops);
    expect(mockEvents.indexOf("b.mp3 plays")).toBeGreaterThan(aStops);
  });

  it("stops a recording before the phone's voice reads, and the voice before a recording", async () => {
    await render(
      <PlayerProvider>
        <Articles />
      </PlayerProvider>,
    );
    await listen("A");
    await listen("C");
    expect(mockEvents.indexOf("voice speaks Texte fictif C")).toBeGreaterThan(
      mockEvents.indexOf("a.mp3 pauses"),
    );
    mockEvents.length = 0;
    await listen("B");
    expect(mockEvents.indexOf("b.mp3 plays")).toBeGreaterThan(mockEvents.indexOf("voice stops"));
    expect(jest.mocked(Speech.speak)).toHaveBeenCalledTimes(1);
  });
});
