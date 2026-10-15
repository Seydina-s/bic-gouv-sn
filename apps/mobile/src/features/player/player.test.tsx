import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { scrolledShare } from "../../components/ScrollTopButton";
import { DETAIL } from "../../testing/news-fixtures";
import { TestProviders } from "../../testing/TestProviders";
import { ArticleView } from "../news/ArticleView";
import { NowReadingBar } from "./NowReadingBar";

let mockPath = "/";
const mockPush = jest.fn();
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-router", () => ({
  useIsFocused: () => true,
  usePathname: () => mockPath,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  maxSpeechInputLength: 4000,
}));

/** A phone's safe area, as the native side would measure it. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** The article, then another screen in its place, with the bar pinned above. */
function App() {
  const [onArticle, setOnArticle] = useState(true);
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <TestProviders>
        <NowReadingBar />
        {onArticle ? (
          <ArticleView detail={DETAIL} isPending={false} paneWidth={390} bottomInset={0} />
        ) : (
          <Text>Accueil</Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            mockPath = "/";
            setOnArticle(false);
          }}
        >
          <Text>Quitter</Text>
        </Pressable>
      </TestProviders>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPath = `/article/${DETAIL.id}`;
});

describe("the app's one reader", () => {
  it("goes on reading after the article is left, pinned at the top until stopped", async () => {
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    // On the article itself, its own controls: no bar.
    expect(screen.queryByTestId("now-reading")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Quitter" }));
    expect(screen.getByTestId("now-reading")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Mettre la lecture en pause" }));
    expect(screen.getByRole("button", { name: "Reprendre la lecture" })).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("link", { name: `En lecture : ${DETAIL.title}. Ouvrir` }),
    );
    expect(mockPush).toHaveBeenCalledWith(`/article/${DETAIL.id}`);
    await fireEvent.press(screen.getByRole("button", { name: "Arrêter la lecture" }));
    expect(screen.queryByTestId("now-reading")).toBeNull();
  });

  it("leaves the bar once the whole text has been read", async () => {
    await render(<App />);
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    await fireEvent.press(screen.getByRole("button", { name: "Quitter" }));
    const speak = jest.mocked(Speech.speak);
    for (let call = 0; call < 50 && screen.queryByTestId("now-reading"); call += 1) {
      await act(() => {
        speak.mock.calls[call]?.[1]?.onDone?.();
      });
    }
    expect(screen.queryByTestId("now-reading")).toBeNull();
  });
});

describe("scrolledShare", () => {
  const event = (y: number, content: number, view: number) => ({
    contentOffset: { x: 0, y },
    contentSize: { width: 390, height: content },
    layoutMeasurement: { width: 390, height: view },
    contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
    zoomScale: 1,
  });

  it("goes from 0 at the top to 1 at the very end, whatever the bounce", () => {
    expect(scrolledShare(event(0, 3000, 1000))).toBe(0);
    expect(scrolledShare(event(1000, 3000, 1000))).toBe(0.5);
    expect(scrolledShare(event(2100, 3000, 1000))).toBe(1);
    expect(scrolledShare(event(-40, 3000, 1000))).toBe(0);
    // A page shorter than the screen has nothing to scroll.
    expect(scrolledShare(event(0, 500, 1000))).toBe(0);
  });
});
