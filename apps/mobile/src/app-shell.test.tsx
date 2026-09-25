import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Linking } from "react-native";
import RootLayout from "./app/_layout";
import TabsLayout from "./app/(tabs)/_layout";
import HomeScreen from "./app/(tabs)/index";
import AssistantScreen from "./app/(tabs)/assistant";
import NearMeScreen from "./app/(tabs)/near-me";
import ParticipateScreen from "./app/(tabs)/participate";
import ProceduresScreen from "./app/(tabs)/procedures";
import ArticleScreen from "./app/article/[id]";
import { LIST, newsFetch } from "./testing/news-fixtures";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

let mockFontState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({ useFonts: () => mockFontState }));

const routes = {
  _layout: RootLayout,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": HomeScreen,
  "(tabs)/near-me": NearMeScreen,
  "(tabs)/assistant": AssistantScreen,
  "(tabs)/procedures": ProceduresScreen,
  "(tabs)/participate": ParticipateScreen,
  "article/[id]": ArticleScreen,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFontState = [true, null];
  globalThis.fetch = newsFetch() as unknown as typeof fetch;
});

describe("app shell", () => {
  it("opens on the front page: masthead, lead story, then the other stories", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Titre de test A")).toBeOnTheScreen();
    expect(screen.getByText("Titre de test B")).toBeOnTheScreen();
    expect(screen.getByText("Conseil des ministres")).toBeOnTheScreen();
    expect(screen.getByText("Actualité")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bic Gouv SN" })).toBeOnTheScreen();
  });

  it("opens an article with its official source link", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByText("Titre de test A"));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
    expect(screen.getByText("Source : presidence.sn")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Lire sur presidence.sn"));
    expect(openURL).toHaveBeenCalledWith("https://www.presidence.sn/fr/actualites/test/");
  });

  it("offers a retry when the feed cannot load and nothing is saved", async () => {
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 500 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(
      await screen.findByText("Les actualités n'ont pas pu être chargées.", {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Réessayer")).toBeOnTheScreen();
  });

  it("discards news saved in an older data format instead of crashing on it", async () => {
    // Saved by a previous app version: no `cover` field yet (regression of 25/09/2026).
    const oldItem: Record<string, unknown> = { ...LIST.items[0], title: "Ancien format" };
    delete oldItem["cover"];
    const now = Date.now();
    await AsyncStorage.setItem(
      "bgs-query-cache",
      JSON.stringify({
        buster: "", // what versions without a contract fingerprint wrote
        timestamp: now,
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: ["news", "fr"],
              queryHash: '["news","fr"]',
              state: {
                data: { pages: [{ items: [oldItem], nextCursor: null }], pageParams: [null] },
                dataUpdatedAt: now,
                dataUpdateCount: 1,
                error: null,
                errorUpdateCount: 0,
                errorUpdatedAt: 0,
                fetchFailureCount: 0,
                fetchFailureReason: null,
                fetchMeta: null,
                fetchStatus: "idle",
                isInvalidated: false,
                status: "success",
              },
            },
          ],
        },
      }),
    );
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 500 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(
      await screen.findByText("Les actualités n'ont pas pu être chargées.", {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Ancien format")).toBeNull();
  });

  it("keeps showing loaded news when a refresh fails, with an offline notice", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Titre de test A")).toBeOnTheScreen();
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 503 }),
    }) as unknown as typeof fetch;
    await fireEvent(screen.getByTestId("news-feed"), "refresh");
    expect(
      await screen.findByText(
        "Hors ligne : voici les dernières actualités enregistrées.",
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Titre de test A")).toBeOnTheScreen();
  });

  it("shows an honest coming-soon screen for sections not built yet", async () => {
    await renderRouter(routes, { initialUrl: "/near-me" });
    await waitFor(() => {
      expect(screen.getByText("Bientôt disponible")).toBeOnTheScreen();
    });
  });

  it("keeps the splash screen while fonts load", async () => {
    mockFontState = [false, null];
    await renderRouter(routes, { initialUrl: "/" });
    expect(screen.queryByText("Titre de test A")).toBeNull();
  });
});
