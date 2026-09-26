import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Dimensions, Linking } from "react-native";
import RootLayout from "./app/_layout";
import TabsLayout from "./app/(tabs)/_layout";
import HomeScreen from "./app/(tabs)/index";
import AssistantScreen from "./app/(tabs)/assistant";
import NearMeScreen from "./app/(tabs)/near-me";
import ParticipateScreen from "./app/(tabs)/participate";
import ProceduresScreen from "./app/(tabs)/procedures";
import ArticleScreen from "./app/article/[id]";
import ProcedureScreen from "./app/procedure/[slug]";
import SectionScreen from "./app/section/[slug]";
import FavoritesScreen from "./app/favorites";
import SearchScreen from "./app/search";
import SettingsScreen from "./app/settings";
import { DETAIL, LIST, newsFetch } from "./testing/news-fixtures";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

let mockFontState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({ useFonts: () => mockFontState }));

/** The first match (a story shows in the carousel and in its section row). */
function first<T>(matches: T[]): T {
  const [match] = matches;
  if (match === undefined) {
    throw new Error("no match");
  }
  return match;
}

const routes = {
  _layout: RootLayout,
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": HomeScreen,
  "(tabs)/near-me": NearMeScreen,
  "(tabs)/assistant": AssistantScreen,
  "(tabs)/procedures": ProceduresScreen,
  "(tabs)/participate": ParticipateScreen,
  "article/[id]": ArticleScreen,
  "procedure/[slug]": ProcedureScreen,
  "section/[slug]": SectionScreen,
  favorites: FavoritesScreen,
  search: SearchScreen,
  settings: SettingsScreen,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  // Most journeys start after the welcome screens (tested on their own below).
  await AsyncStorage.setItem("bgs-onboarding", "done");
  mockFontState = [true, null];
  globalThis.fetch = newsFetch() as unknown as typeof fetch;
});

describe("first run", () => {
  it("welcomes with the language first, then one idea per screen, then the app", async () => {
    await AsyncStorage.removeItem("bgs-onboarding");
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Choisissez votre langue")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "Wolof" }));
    expect(screen.getByRole("radio", { name: "Wolof", checked: true })).toBeOnTheScreen();
    for (const title of [
      "L'action du gouvernement, chaque jour",
      "La source, toujours",
      "Gardez l'essentiel, même sans réseau",
    ]) {
      await fireEvent.press(screen.getByRole("button", { name: "Suivant" }));
      expect(await screen.findByText(title)).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole("button", { name: "Commencer" }));
    expect(screen.queryByText("Gardez l'essentiel, même sans réseau")).toBeNull();
    expect(await AsyncStorage.multiGet(["bgs-onboarding", "bgs-language"])).toEqual([
      ["bgs-onboarding", "done"],
      ["bgs-language", "wo"],
    ]);
  });

  it("can be skipped at any step", async () => {
    await AsyncStorage.removeItem("bgs-onboarding");
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Passer" }));
    expect(screen.queryByText("Choisissez votre langue")).toBeNull();
    expect((await screen.findAllByText("Titre de test A"))[0]).toBeOnTheScreen();
  });
});

describe("app shell", () => {
  it("opens on the front page: carousel, then one row of cards per section", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(
      await screen.findByRole("button", {
        name: /^Article 1 sur 2\. Conseil des ministres\. Titre de test A/,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bic Gouv SN" })).toBeOnTheScreen();
    // Rows in the official order, each with its "Voir plus" leading to the section.
    expect(screen.getByRole("header", { name: "Conseil des ministres" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Actualité" })).toBeOnTheScreen();
    await fireEvent.press(
      first(screen.getAllByRole("button", { name: "Voir plus\u00a0: Conseil des ministres" })),
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => url.includes("category=conseil-des-ministres&page=1")),
      ).toBe(true);
    });
  });

  it("lets the reader pause the carousel", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(
      await screen.findByRole("button", { name: "Mettre en pause le défilement" }),
    );
    expect(screen.getByRole("button", { name: "Reprendre le défilement" })).toBeOnTheScreen();
  });

  it("searches the news from the front page and opens a result", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Rechercher" }));
    expect(await screen.findByText(/Tapez au moins 2 lettres/)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Rechercher"), "Kaolack");
    expect(await screen.findByText("Titre de test B", {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("search?lang=fr&q=Kaolack"))).toBe(
      true,
    );
    await fireEvent.press(screen.getByText("Titre de test A"));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
  });

  it("says when a search needs a connection", async () => {
    globalThis.fetch = newsFetch({
      search: () => new Response("{}", { status: 503 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/search" });
    await fireEvent.changeText(await screen.findByLabelText("Rechercher"), "Kaolack");
    expect(
      await screen.findByText(/La recherche a besoin d'une connexion/, {}, { timeout: 8000 }),
    ).toBeOnTheScreen();
  });

  it("says when a search finds nothing", async () => {
    globalThis.fetch = newsFetch({
      search: () => new Response(JSON.stringify({ items: [], nextCursor: null })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/search" });
    await fireEvent.changeText(await screen.findByLabelText("Rechercher"), "introuvable");
    expect(
      await screen.findByText(
        "Aucun résultat pour «\u00a0introuvable\u00a0».",
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
  });

  it("shows list and article side by side on a wide window (tablet, unfolded)", async () => {
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 1024, height: 768 } });
    try {
      await renderRouter(routes, { initialUrl: "/" });
      expect((await screen.findAllByText("Titre de test B"))[0]).toBeOnTheScreen();
      // The first story opens in the detail pane, with its actions, without navigating.
      expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Ajouter aux favoris" })).toBeOnTheScreen();
      // Both at once: on a phone, the paragraph only shows after opening the article.
      expect(screen.getAllByText("Titre de test B")[0]).toBeOnTheScreen();
    } finally {
      Dimensions.set({ window: phone });
    }
  });

  it("remembers the appearance and language chosen in the settings", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Sombre" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Wolof" }));
    expect(screen.getByRole("radio", { name: "Sombre", checked: true })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Wolof", checked: true })).toBeOnTheScreen();
    // Read after the actions (an async callback inside waitFor overlaps act() calls).
    expect(await AsyncStorage.multiGet(["bgs-theme", "bgs-language"])).toEqual([
      ["bgs-theme", "dark"],
      ["bgs-language", "wo"],
    ]);
  });

  it("starts with the saved choices, and ignores a damaged one", async () => {
    await AsyncStorage.multiSet([
      ["bgs-theme", "purple"],
      ["bgs-language", "wo"],
    ]);
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/settings" });
    expect(await screen.findByRole("radio", { name: "Wolof", checked: true })).toBeOnTheScreen();
    expect(
      screen.getByRole("radio", { name: "Comme le téléphone", checked: true }),
    ).toBeOnTheScreen();
  });

  it("opens a section from its chip, 20 stories per numbered page", async () => {
    const fetchMock = newsFetch({
      list: () => new Response(JSON.stringify({ ...LIST, total: 45 })),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    await screen.findAllByText("Titre de test A");
    await fireEvent.press(screen.getByRole("button", { name: "Communiqués" }));
    expect(await screen.findByText("45 articles")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Communiqués", selected: true })).toBeOnTheScreen();
    expect(screen.getByText("Page 1 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("category=communiques&page=1"))).toBe(
      true,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Page 3" }));
    expect(await screen.findByText("Page 3 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("category=communiques&page=3"))).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
  });

  it('goes back to the front page from the section\'s "Tout" chip', async () => {
    await renderRouter(routes, { initialUrl: "/section/discours" });
    expect(await screen.findByRole("header", { name: "Discours" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tout" }));
    expect(await screen.findByRole("header", { name: "Bic Gouv SN" })).toBeOnTheScreen();
  });

  it("keeps an article in the favorites, saved on the phone", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    await fireEvent.press(await screen.findByRole("button", { name: "Ajouter aux favoris" }));
    expect(await screen.findByRole("button", { name: "Retirer des favoris" })).toBeOnTheScreen();
    expect(await AsyncStorage.getItem("bgs-favorites-v1")).toContain(DETAIL.id);
  });

  it("reads a kept article offline, from its saved copy", async () => {
    await AsyncStorage.setItem(
      "bgs-favorites-v1",
      JSON.stringify([{ detail: DETAIL, savedAt: "2026-09-26T08:00:00Z" }]),
    );
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 503 }),
      detail: () => new Response("{}", { status: 503 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/favorites" });
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
  });

  it("shows how to keep articles when there is no favorite yet", async () => {
    await renderRouter(routes, { initialUrl: "/favorites" });
    expect(
      await screen.findByText(/Touchez le marque-page d'un article pour le garder/),
    ).toBeOnTheScreen();
  });

  it("opens an article with its official source link", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
    expect(screen.getByText("Source\u00a0: presidence.sn")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Lire sur presidence.sn"));
    expect(openURL).toHaveBeenCalledWith("https://www.presidence.sn/fr/actualites/test/");
  });

  it("offers a retry when the feed cannot load and nothing is saved", async () => {
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 500 }),
      sections: () => new Response("{}", { status: 500 }),
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
      sections: () => new Response("{}", { status: 500 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(
      await screen.findByText("Les actualités n'ont pas pu être chargées.", {}, { timeout: 5000 }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Ancien format")).toBeNull();
  });

  it("keeps showing loaded news when a refresh fails, with an offline notice", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    expect((await screen.findAllByText("Titre de test A"))[0]).toBeOnTheScreen();
    globalThis.fetch = newsFetch({
      list: () => new Response("{}", { status: 503 }),
    }) as unknown as typeof fetch;
    // Pull to refresh: the ScrollView carries its RefreshControl as a prop.
    const refresh = (
      screen.getByTestId("news-feed").props as {
        refreshControl: { props: { onRefresh: () => void } };
      }
    ).refreshControl.props.onRefresh;
    await act(() => {
      refresh();
    });
    expect(
      await screen.findByText(
        "Hors ligne\u00a0: voici les dernières actualités enregistrées. Mis à jour à l'instant.",
        {},
        { timeout: 5000 },
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("Titre de test A")[0]).toBeOnTheScreen();
  });

  it("shows an honest coming-soon screen for sections not built yet", async () => {
    await renderRouter(routes, { initialUrl: "/near-me" });
    await waitFor(() => {
      expect(screen.getByText("Bientôt disponible")).toBeOnTheScreen();
    });
  });

  it("lists the procedures with their known facts, and searches them", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/procedures" });
    expect(await screen.findByText("2 démarches")).toBeOnTheScreen();
    expect(screen.getByText("Démarche de test A")).toBeOnTheScreen();
    expect(screen.getByText(/^20.000.F.CFA$/)).toBeOnTheScreen();
    expect(screen.getByText("1 jour")).toBeOnTheScreen();
    expect(screen.getByText("Possible en ligne")).toBeOnTheScreen();
    // Unknown facts are left out, never shown as "free".
    expect(screen.getAllByText(/F.CFA$/)).toHaveLength(1);
    await fireEvent.changeText(screen.getByLabelText("Rechercher une démarche"), "passeport");
    await waitFor(
      () => {
        expect(fetchMock.mock.calls.some(([url]) => url.includes("q=passeport"))).toBe(true);
      },
      { timeout: 3000 },
    );
  });

  it("says when no procedure matches", async () => {
    globalThis.fetch = newsFetch({
      procedures: () => new Response(JSON.stringify({ items: [], nextCursor: null, total: 0 })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/procedures" });
    expect(await screen.findByText("0 démarche")).toBeOnTheScreen();
  });

  it("explains a procedure and leads to its official page", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/procedures" });
    await fireEvent.press(await screen.findByText("Démarche de test A"));
    expect(await screen.findByText("Public de test.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Pièces à fournir" })).toBeOnTheScreen();
    expect(screen.getByText("Pièce de test")).toBeOnTheScreen();
    expect(screen.getByText("Étape de test.")).toBeOnTheScreen();
    expect(screen.getByText("Réponse de test.")).toBeOnTheScreen();
    expect(screen.getByText(/Source.: e-senegal.sn/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Faire la démarche sur e-senegal.sn" }));
    expect(openURL).toHaveBeenCalledWith(
      "https://e-senegal.sn/#/comprendre-ma-demarche/demarche/demarche-test-a",
    );
    openURL.mockRestore();
  });

  it("keeps the splash screen while fonts load", async () => {
    mockFontState = [false, null];
    await renderRouter(routes, { initialUrl: "/" });
    expect(screen.queryByText("Titre de test A")).toBeNull();
  });
});
