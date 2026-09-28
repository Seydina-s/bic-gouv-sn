import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
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
import ProcedureThemeScreen from "./app/procedure-theme/[id]";
import SectionScreen from "./app/section/[slug]";
import FavoritesScreen from "./app/favorites";
import LicencesScreen from "./app/licences";
import SearchScreen from "./app/search";
import ServiceScreen from "./app/service/[id]";
import { clearMapCalls, mapCalls, offlineRequests } from "./testing/maplibre-mock";
import { DETAIL, LIST, newsFetch } from "./testing/news-fixtures";
import { PROCEDURE_LIST } from "./testing/procedure-fixtures";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

let mockFontState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({ useFonts: () => mockFontState }));

// The native map exists only in the app's own builds: a stand-in draws it here.
let mockMapAvailable = false;
jest.mock("./features/near-me/map-support", () => ({
  nativeMapAvailable: () => mockMapAvailable,
}));
jest.mock("@maplibre/maplibre-react-native", () =>
  jest.requireActual<object>("./testing/maplibre-mock"),
);
// Jest cannot run import(): the map is handed over directly.
jest.mock("./features/near-me/load-service-map", () => ({
  loadServiceMap: () =>
    Promise.resolve(jest.requireActual<object>("./features/near-me/ServiceMap")),
  loadOfflineManager: () =>
    Promise.resolve(
      jest.requireActual<{ OfflineManager: object }>("./testing/maplibre-mock").OfflineManager,
    ),
}));

/** Official themes with nothing validated yet: the Démarches tab falls back to the list. */
const noValidatedTheme = () => new Response(JSON.stringify({ themes: [] }));

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
  "procedure-theme/[id]": ProcedureThemeScreen,
  "section/[slug]": SectionScreen,
  "service/[id]": ServiceScreen,
  favorites: FavoritesScreen,
  licences: LicencesScreen,
  search: SearchScreen,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  // Most journeys start after the welcome screens (tested on their own below).
  await AsyncStorage.setItem("bgs-onboarding", "done");
  mockFontState = [true, null];
  mockMapAvailable = false;
  clearMapCalls();
  globalThis.fetch = newsFetch() as unknown as typeof fetch;
});

/** A touch on the map's points, as the native map reports it. */
function touchOnPoints(properties: Record<string, unknown>, coordinates: [number, number]) {
  return {
    stopPropagation: jest.fn(),
    nativeEvent: {
      features: [{ type: "Feature", geometry: { type: "Point", coordinates }, properties }],
    },
  };
}

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
      // The screens still mounted re-render for the new size: inside act, like any update.
      await act(() => {
        Dimensions.set({ window: phone });
      });
    }
  });

  it("opens the settings over the front page, which stays in place when they close", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    expect(await screen.findByRole("radio", { name: "Sombre" })).toBeOnTheScreen();
    // The front page is still mounted underneath (a pop-up, not a new page).
    expect(screen.getByTestId("news-feed", { includeHiddenElements: true })).toBeTruthy();
    // "À propos" credits the data, fonts and icons, each with its licence.
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await fireEvent.press(screen.getByRole("link", { name: /OpenStreetMap, licence ODbL$/ }));
    expect(openURL).toHaveBeenCalledWith("https://www.openstreetmap.org/copyright");
    for (const credit of [/SIL Open Font License$/, /Mapzen, licence MIT$/, /Phosphor Icons/]) {
      expect(screen.getByRole("link", { name: credit })).toBeOnTheScreen();
    }
    openURL.mockRestore();
    await fireEvent.press(first(screen.getAllByRole("button", { name: "Fermer les réglages" })));
    expect(screen.queryByRole("radio", { name: "Sombre" })).toBeNull();
    expect(screen.getByTestId("news-feed")).toBeOnTheScreen();
  });

  it("follows the console's kill switches: a feature switched off says so plainly", async () => {
    mockMapAvailable = true;
    globalThis.fetch = newsFetch({
      remoteConfig: () =>
        new Response(
          JSON.stringify({
            minVersion: null,
            features: { nearMe: true, map: false, readAloud: false, procedures: false },
          }),
        ),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    // The map is off: the list stays, without the "Carte" pill.
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Afficher les services sur la carte" }),
      ).toBeNull();
    });
    await fireEvent.press(screen.getByRole("tab", { name: /Démarches/ }));
    expect(await screen.findByText("Momentanément indisponible")).toBeOnTheScreen();
  });

  it("asks for an update when this version is older than the oldest allowed", async () => {
    globalThis.fetch = newsFetch({
      remoteConfig: () => new Response(JSON.stringify({ minVersion: "99.0.0", features: {} })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Une nouvelle version est nécessaire")).toBeOnTheScreen();
  });

  it("lists the free software of the app, each with its copyright and licence", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Logiciels libres utilisés \(\d+\)$/ }),
    );
    expect(await screen.findByText(/logiciels libres font fonctionner/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^zod \d/ }));
    expect(screen.getByText(/Copyright \(c\) \d{4} Colin McDonnell/)).toBeOnTheScreen();
    expect(screen.getByText(/Permission is hereby granted/)).toBeOnTheScreen();
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
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
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
    // The band says which page this is, the section name is not repeated in the top bar.
    expect(await screen.findByText("45 articles · Page 1 sur 3")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Communiqués", selected: true })).toBeOnTheScreen();
    expect(screen.getByText("Page 1 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("category=communiques&page=1"))).toBe(
      true,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Articles suivants" }));
    expect(await screen.findByText("45 articles · Page 2 sur 3")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Page 3" }));
    expect(await screen.findByText("Page 3 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("category=communiques&page=3"))).toBe(
      true,
    );
    expect(screen.getByRole("button", { name: "Page suivante" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Articles suivants" })).toBeNull();
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

  it("saves data on request: the photos of an article then wait for a tap", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Toujours" }));
    expect(await AsyncStorage.getItem("bgs-data-saver")).toBe("always");
    await fireEvent.press(first(screen.getAllByRole("button", { name: "Fermer les réglages" })));
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
    const showPhoto = screen.getAllByRole("button", { name: "Afficher la photo" });
    expect(showPhoto.length).toBeGreaterThan(0);
    await fireEvent.press(first(showPhoto));
    expect(screen.getAllByRole("button", { name: "Afficher la photo" }).length).toBe(
      showPhoto.length - 1,
    );
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

  it("offers a way back to the top and the app bar once a list has been scrolled", async () => {
    await renderRouter(routes, { initialUrl: "/section/discours" });
    const list = await screen.findByTestId("section-list");
    expect(screen.queryByRole("button", { name: "Revenir en haut" })).toBeNull();
    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { x: 0, y: 2000 },
        contentSize: { width: 390, height: 5000 },
        layoutMeasurement: { width: 390, height: 844 },
      },
    });
    expect(await screen.findByRole("button", { name: "Revenir en haut" })).toBeOnTheScreen();
    // The app bar slides in at the same moment: settings are one tap away.
    await fireEvent.press(screen.getByRole("button", { name: "Réglages" }));
    expect(await screen.findByRole("radio", { name: "Sombre" })).toBeOnTheScreen();
  });

  it("shows an honest coming-soon screen for sections not built yet", async () => {
    await renderRouter(routes, { initialUrl: "/assistant" });
    await waitFor(() => {
      expect(screen.getByText("Bientôt disponible")).toBeOnTheScreen();
    });
  });

  it("lists the verified services, then the nearest from a chosen town, with directions", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/near-me" });
    expect(await screen.findByText("Commissariat de test proche")).toBeOnTheScreen();
    // Expo Go and the web have no native map: the list is all there is.
    expect(screen.queryByRole("button", { name: "Afficher les services sur la carte" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Choisir une ville" }));
    await fireEvent.changeText(screen.getByLabelText("Rechercher une ville"), "ville de");
    await fireEvent.press(screen.getByRole("button", { name: "Ville de test" }));
    expect(await screen.findByText("Autour de Ville de test")).toBeOnTheScreen();
    expect(screen.getByText(/^Police · à 110.m$/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Commissariat de test proche/ }));
    expect(
      await screen.findByRole("header", { name: "Commissariat de test proche" }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/^Du lundi au vendredi, de 8.h à 17.h.$/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Itinéraire" }));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining("14.701,-17.4"));
    openURL.mockRestore();
  });

  it("asks for the location only when asked, and offers a town after a refusal", async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Utiliser ma position" }));
    expect(await screen.findByText(/La localisation n'est pas autorisée/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Choisir une ville" })).toBeOnTheScreen();
  });

  it("ranks the services from the phone's position, which is never sent", async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getLastKnownPositionAsync)
      .mockResolvedValue({ coords: { latitude: 14.7, longitude: -17.4 } } as never);
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Tribunal de test");
    await fireEvent.press(screen.getByRole("button", { name: "Utiliser ma position" }));
    expect(await screen.findByText("Autour de votre position")).toBeOnTheScreen();
    expect(screen.getByText(/^Police · à 110.m$/)).toBeOnTheScreen();
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("14.7") || url.includes("-17.4")),
    ).toBe(false);
  });

  it("arrives filtered on the kind a procedure asked for", async () => {
    await renderRouter(routes, { initialUrl: "/near-me?category=tribunal" });
    expect(await screen.findByText("Tribunal de test")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tribunaux", selected: true })).toBeOnTheScreen();
    expect(screen.queryByText("Commissariat de test proche")).toBeNull();
  });

  it("says honestly when no service has been verified yet", async () => {
    mockMapAvailable = true;
    globalThis.fetch = newsFetch({
      services: () => new Response(JSON.stringify({ services: [], places: [] })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/near-me" });
    expect(await screen.findByText(/arrivent bientôt ici/)).toBeOnTheScreen();
    // Nothing to show yet: neither the location nor an empty map is offered.
    expect(screen.queryByRole("button", { name: "Utiliser ma position" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Afficher les services sur la carte" })).toBeNull();
  });

  it("shows the verified services on the map, then the one touched, its page and the way there", async () => {
    mockMapAvailable = true;
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    await fireEvent.press(
      screen.getByRole("button", { name: "Afficher les services sur la carte" }),
    );
    const map = await screen.findByTestId("service-map");
    // The base map comes from our API, in the app's theme.
    expect(map).toHaveProp(
      "mapStyle",
      expect.stringMatching(/\/v1\/map\/style\.json\?theme=light$/),
    );
    expect(map).toHaveProp("accessibilityLabel", "Carte des services de l'État vérifiés");
    expect(screen.getByRole("button", { name: "Tribunaux" })).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Données © les contributeurs d'OpenStreetMap" }),
    ).toBeOnTheScreen();
    const points = screen.getByTestId("service-points");
    const drawn = points.props as { data: { features: unknown[] } };
    expect(drawn.data.features).toHaveLength(3);

    await fireEvent.press(
      points,
      touchOnPoints({ id: "osm-n2", name: "Commissariat de test proche" }, [-17.4, 14.701]),
    );
    expect(
      await screen.findByRole("header", { name: "Commissariat de test proche" }),
    ).toBeOnTheScreen();
    expect(mapCalls.camera.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-17.4, 14.701] }),
    );
    await fireEvent.press(screen.getByRole("link", { name: "Itinéraire" }));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining("14.701,-17.4"));
    // A touch on the map itself closes the preview; the list is one tap away again.
    await fireEvent.press(map);
    expect(screen.queryByTestId("service-preview")).toBeNull();
    await fireEvent.press(
      points,
      touchOnPoints({ id: "osm-n2", name: "Commissariat de test proche" }, [-17.4, 14.701]),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Voir la fiche" }));
    expect(await screen.findByText(/^Du lundi au vendredi, de 8.h à 17.h.$/)).toBeOnTheScreen();
    openURL.mockRestore();
  });

  it("opens a group of nearby services by zooming in on it", async () => {
    mockMapAvailable = true;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    await fireEvent.press(
      screen.getByRole("button", { name: "Afficher les services sur la carte" }),
    );
    await fireEvent.press(
      await screen.findByTestId("service-points"),
      touchOnPoints({ cluster: true, cluster_id: 3, point_count: 2 }, [-17.4, 14.75]),
    );
    await waitFor(() => {
      expect(mapCalls.camera.easeTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [-17.4, 14.75], zoom: 16 }),
      );
    });
    expect(mapCalls.source.getClusterExpansionZoom).toHaveBeenCalledWith(3);
    expect(screen.queryByTestId("service-preview")).toBeNull();
  });

  it("finds the person on the map only when asked, and keeps the position on the phone", async () => {
    mockMapAvailable = true;
    jest.mocked(Location.requestForegroundPermissionsAsync).mockClear();
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getLastKnownPositionAsync)
      .mockResolvedValue({ coords: { latitude: 14.7, longitude: -17.4 } } as never);
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    await fireEvent.press(
      screen.getByRole("button", { name: "Afficher les services sur la carte" }),
    );
    await screen.findByTestId("service-map");
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId("user-location")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Me localiser sur la carte" }));
    expect(await screen.findByTestId("user-location")).toBeOnTheScreen();
    await waitFor(() => {
      expect(mapCalls.camera.flyTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [-17.4, 14.7] }),
      );
    });
    expect(
      fetchMock.mock.calls.some(([url]) => url.includes("14.7") || url.includes("-17.4")),
    ).toBe(false);
  });

  it("keeps the streets around the person offline, one area at a time", async () => {
    mockMapAvailable = true;
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getLastKnownPositionAsync)
      .mockResolvedValue({ coords: { latitude: 14.7, longitude: -17.4 } } as never);
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    await fireEvent.press(
      screen.getByRole("button", { name: "Afficher les services sur la carte" }),
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Me localiser sur la carte" }));
    await fireEvent.press(
      await screen.findByRole("button", { name: /^Garder le quartier hors ligne \(\d+ Mo\)$/ }),
    );
    await waitFor(() => {
      expect(offlineRequests).toHaveLength(1);
    });
    expect(offlineRequests[0]?.options).toMatchObject({
      minZoom: 12,
      maxZoom: 15,
      metadata: { place: "14.700,-17.400" },
    });
    await act(() => {
      offlineRequests[0]?.progress({}, { state: "active", percentage: 40 });
    });
    expect(screen.getByText(/enregistrement.:.40.%$/)).toBeOnTheScreen();
    await act(() => {
      offlineRequests[0]?.progress({}, { state: "complete", percentage: 100 });
    });
    expect(screen.getByText("Quartier disponible hors ligne")).toBeOnTheScreen();
  });

  it("falls back to the list when the map cannot load", async () => {
    mockMapAvailable = true;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    await fireEvent.press(
      screen.getByRole("button", { name: "Afficher les services sur la carte" }),
    );
    await fireEvent(await screen.findByTestId("service-map"), "didFailLoadingMap");
    expect(await screen.findByText(/La carte n'a pas pu s'afficher/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Liste" }));
    expect(await screen.findByText("Commissariat de test proche")).toBeOnTheScreen();
    expect(screen.queryByTestId("service-map")).toBeNull();
  });

  it("lists the procedures with their known facts while no theme is validated, and searches", async () => {
    const fetchMock = newsFetch({ procedureThemes: noValidatedTheme });
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

  it("shows the themes holding validated procedures, and opens one", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/procedures" });
    await fireEvent.press(await screen.findByRole("button", { name: "Transports. 3 démarches" }));
    expect(screen.queryByRole("button", { name: /^Finances/ })).toBeNull();
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url.includes("theme=a1"))).toBe(true);
    });
    expect(await screen.findByText("Démarche de test A")).toBeOnTheScreen();
  });

  it("says when no procedure matches", async () => {
    globalThis.fetch = newsFetch({
      procedures: () => new Response(JSON.stringify({ items: [], nextCursor: null, total: 0 })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/procedures" });
    await fireEvent.changeText(
      await screen.findByLabelText("Rechercher une démarche"),
      "introuvable",
    );
    expect(await screen.findByText("0 démarche", {}, { timeout: 3000 })).toBeOnTheScreen();
  });

  it("shows only the theme cards while browsing, and the results of a search", async () => {
    await renderRouter(routes, { initialUrl: "/procedures" });
    expect(
      await screen.findByRole("button", { name: "Transports. 3 démarches" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Démarche de test A")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Rechercher une démarche"), "test");
    expect(await screen.findByText("Démarche de test A", {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Transports. 3 démarches" })).toBeNull();
  });

  it("pages through a theme, 20 procedures per numbered page", async () => {
    const fetchMock = newsFetch({
      procedures: () => new Response(JSON.stringify({ ...PROCEDURE_LIST, total: 45 })),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/procedure-theme/a1" });
    expect(await screen.findByText("45 démarches · Page 1 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("theme=a1&page=1"))).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Démarches suivantes" }));
    expect(await screen.findByText("45 démarches · Page 2 sur 3")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Page 3" }));
    expect(await screen.findByText("Page 3 sur 3")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("theme=a1&page=3"))).toBe(true);
  });

  it("explains a procedure and leads to its official page", async () => {
    globalThis.fetch = newsFetch({ procedureThemes: noValidatedTheme }) as unknown as typeof fetch;
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
