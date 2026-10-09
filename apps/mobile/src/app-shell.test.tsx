import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Dimensions, Keyboard, Linking, Share } from "react-native";
import RootLayout from "./app/_layout";
import TabsLayout from "./app/(tabs)/_layout";
import HomeScreen from "./app/(tabs)/index";
import AssistantScreen from "./app/(tabs)/assistant";
import NearMeScreen from "./app/(tabs)/near-me";
import ParticipateScreen from "./app/(tabs)/participate";
import ProceduresScreen from "./app/(tabs)/procedures";
import ArticleScreen from "./app/article/[id]";
import OpportunitiesScreen from "./app/opportunities";
import OpportunityScreen from "./app/opportunity/[id]";
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
  // Not allowed yet: nothing is located at opening unless a test says so.
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  enableNetworkProviderAsync: jest.fn(() => Promise.resolve()),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

let mockFontState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({ useFonts: () => mockFontState }));

// The photo picker exists only in builds made since Participer: a stand-in here.
let mockPickerAvailable = false;
const mockPicker = {
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri: "file:///photo-fictive.jpg", base64: "UGhvdG9GaWN0aXZl" }],
    }),
  ),
};
jest.mock("./features/participate/load-image-picker", () => ({
  imagePickerAvailable: () => mockPickerAvailable,
  loadImagePicker: () => mockPicker,
}));

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
  opportunities: OpportunitiesScreen,
  "opportunity/[id]": OpportunityScreen,
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
  mockPickerAvailable = false;
  clearMapCalls();
  // Each journey counts its own questions to the phone.
  jest.mocked(Location.requestForegroundPermissionsAsync).mockClear();
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
      "Le Gouvernement, en un seul endroit",
      "La source, toujours",
      "Gardez l'essentiel, même sans réseau",
    ]) {
      await fireEvent.press(screen.getByRole("button", { name: "Suivant" }));
      expect(await screen.findByText(title)).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole("button", { name: "Commencer" }));
    // The welcome screens fade away to reveal the app (no sudden cut).
    await waitFor(() => {
      expect(screen.queryByText("Gardez l'essentiel, même sans réseau")).toBeNull();
    });
    expect(await AsyncStorage.multiGet(["bgs-onboarding", "bgs-language"])).toEqual([
      ["bgs-onboarding", "done"],
      ["bgs-language", "wo"],
    ]);
  });

  it("can be skipped at any step", async () => {
    await AsyncStorage.removeItem("bgs-onboarding");
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Passer" }));
    await waitFor(() => {
      expect(screen.queryByText("Choisissez votre langue")).toBeNull();
    });
    expect((await screen.findAllByText("Titre de test A"))[0]).toBeOnTheScreen();
  });
});

describe("app shell", () => {
  it("loads the first stories of the front page in advance", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    const detailCalls = () =>
      fetchMock.mock.calls.filter(([url]) => /\/v1\/news\/[0-9a-f-]{36}\?lang=fr/.test(url)).length;
    await waitFor(() => {
      expect(detailCalls()).toBe(2);
    });
  });

  it("loads nothing in advance when saving data", async () => {
    await AsyncStorage.setItem("bgs-data-saver", "always");
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    // Checked once the stories are shown: an advance load starts with that render.
    expect(
      await screen.findByRole("button", { name: /^Article 1 sur 2\. Conseil des ministres/ }),
    ).toBeOnTheScreen();
    const detailCalls = fetchMock.mock.calls.filter(([url]) =>
      /\/v1\/news\/[0-9a-f-]{36}\?lang=fr/.test(url),
    );
    expect(detailCalls).toHaveLength(0);
  });

  it("opens on the front page: carousel, then one row of cards per section", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(
      await screen.findByRole("button", {
        name: /^Article 1 sur 2\. Conseil des ministres\. Titre de test A/,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Bic Gouv Sn" })).toBeOnTheScreen();
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

  it("restarts the presentation of the app from the settings", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Redémarrer" }));
    expect(await screen.findByText("Choisissez votre langue")).toBeOnTheScreen();
    expect(screen.getByText("Étape 1 sur 4")).toBeOnTheScreen();
    expect(await AsyncStorage.getItem("bgs-onboarding")).toBeNull();
  });

  it("lets the person allow the location from the settings, asked once on the front page", async () => {
    await AsyncStorage.setItem("bgs-location-invited", "yes");
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getLastKnownPositionAsync)
      .mockResolvedValue({ coords: { latitude: 14.7, longitude: -17.4 } } as never);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Autoriser la localisation" }));
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/^Autorisée/)).toBeOnTheScreen();
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

  it("keeps the opportunities on the front page while none is published, saying so", async () => {
    globalThis.fetch = newsFetch({
      opportunities: () => new Response(JSON.stringify({ opportunities: [] })),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Aucune opportunité ouverte pour l'instant.")).toBeOnTheScreen();
    expect(screen.getByText("Opportunités")).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: "Tout voir" })).toBeOnTheScreen();
  });

  it("shows the opportunities after the articles, each leading to its official page", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/" });
    expect(await screen.findByText("Opportunités")).toBeOnTheScreen();
    expect(screen.getByText("Plus que 3 jours")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /Formation fictive de test/ }));
    expect(await screen.findByText("Résumé fictif de la page officielle.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Voir l'offre officielle" }));
    expect(openURL).toHaveBeenCalledWith("https://3fpt.sn/appel-a-candidature/");
    // Passed on by message with what it is, who offers it, until when, and the page.
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await fireEvent.press(screen.getByRole("button", { name: "Partager cette opportunité" }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://3fpt.sn/appel-a-candidature/",
        message: expect.stringMatching(
          /^Formation fictive de test\n.+\nPlus que 3 jours\nhttps:\/\/3fpt\.sn\/appel-a-candidature\/$/,
        ) as unknown,
      }),
    );
    await act(() => {
      router.push("/opportunities");
    });
    // Every open one, filtered by kind on request.
    expect(await screen.findByText("Recrutement fictif de test")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Emploi" }));
    expect(screen.queryByText("Formation fictive de test")).toBeNull();
    expect(screen.getByText("Sans date limite")).toBeOnTheScreen();
  });

  it("asks one question at a time with large tiles, never cut by a sideways row", async () => {
    globalThis.fetch = newsFetch() as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/participate" });
    expect(await screen.findByText("Votre message porte sur…")).toBeOnTheScreen();
    expect(screen.getByText("Étape 1 sur 2")).toBeOnTheScreen();
    const next = screen.getByRole("button", { name: "Continuer" });
    expect(next).toBeDisabled();
    await fireEvent.press(screen.getByRole("radio", { name: "Autre chose, Tout le reste" }));
    expect(next).toBeEnabled();
    interface Node {
      props?: { horizontal?: boolean };
      children?: (Node | string)[] | null;
    }
    const sideways = (node: Node | string | null): number =>
      typeof node === "string" || node === null
        ? 0
        : (node.props?.horizontal === true ? 1 : 0) +
          (node.children ?? []).reduce((sum, child) => sum + sideways(child), 0);
    expect(sideways(screen.toJSON() as Node | null)).toBe(0);
  });

  it("sends a message to the government in two steps, anonymous, and says it went", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/participate" });
    await fireEvent.press(
      await screen.findByRole("radio", { name: "L'application, Un avis sur l'app" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 2 sur 2")).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText("Votre message"),
      "Un message fictif pour les tests.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      await screen.findByText("Merci, votre message a bien été transmis à l'équipe."),
    ).toBeOnTheScreen();
    const sent = fetchMock.mock.calls.find(([url]) => url.includes("/v1/participation/messages"));
    const init = (sent as unknown as [string, RequestInit] | undefined)?.[1];
    expect(JSON.parse(init?.body as string)).toEqual({
      topic: "application",
      text: "Un message fictif pour les tests.",
      lang: "fr",
    });
    expect(new Headers(init?.headers).get("idempotency-key")).toMatch(/^[a-z0-9-]{16,}$/);
    // Another one starts from the first question.
    await fireEvent.press(screen.getByRole("button", { name: "Écrire un autre message" }));
    expect(screen.getByText("Étape 1 sur 2")).toBeOnTheScreen();
  });

  it("reports another kind of problem, said in words, with a photo, a place and what happened", async () => {
    mockPickerAvailable = true;
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/participate" });
    await fireEvent.press(await screen.findByRole("radio", { name: "Signaler un problème" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Autre, À préciser" }));
    const next = screen.getByRole("button", { name: "Continuer" });
    expect(next).toBeDisabled();
    await fireEvent.changeText(
      screen.getByLabelText("Précisez la nature du problème"),
      "Feu tricolore fictif en panne",
    );
    await fireEvent.press(next);
    await fireEvent.press(screen.getByRole("button", { name: "Choisir une photo" }));
    expect(await screen.findByLabelText("Photo jointe au signalement")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Continuer" }));
    await fireEvent.changeText(
      screen.getByLabelText("Lieu (quartier, commune), facultatif"),
      "Quartier fictif",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("Étape 4 sur 4")).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText("Ce que vous avez vu"),
      "Un feu fictif éteint au carrefour.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      await screen.findByText("Merci, votre signalement a bien été transmis à l'équipe."),
    ).toBeOnTheScreen();
    const sent = fetchMock.mock.calls.find(([url]) => url.includes("/v1/participation/reports"));
    const init = (sent as unknown as [string, RequestInit] | undefined)?.[1];
    expect(JSON.parse(init?.body as string)).toEqual({
      category: "autre",
      detail: "Feu tricolore fictif en panne",
      text: "Un feu fictif éteint au carrefour.",
      place: "Quartier fictif",
      photo: "UGhvdG9GaWN0aXZl",
      lang: "fr",
    });
  });

  it("explains a refused sending, and offers no photo where the build cannot take one", async () => {
    globalThis.fetch = newsFetch({
      participation: () => new Response("{}", { status: 429 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/participate" });
    await fireEvent.press(
      await screen.findByRole("radio", { name: "Le gouvernement, Une idée, une remarque" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continuer" }));
    await fireEvent.changeText(screen.getByLabelText("Votre message"), "Un message fictif répété.");
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText(/Beaucoup d'envois depuis ce réseau/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "Signaler un problème" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Voirie, Route, trottoir" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continuer" }));
    expect(
      screen.getByText("L'ajout de photo arrivera avec la prochaine version de l'application."),
    ).toBeOnTheScreen();
    // Back to the first question, the choice kept.
    await fireEvent.press(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByRole("radio", { name: "Voirie, Route, trottoir" })).toBeChecked();
  });

  it("opens another tab the instant the finger lands, and only once", async () => {
    await renderRouter(routes, { initialUrl: "/" });
    await screen.findAllByText("Titre de test A");
    const procedures = screen.getByRole("tab", { name: /Démarches/ });
    const intro = "Les démarches administratives officielles, expliquées simplement.";
    expect(screen.queryByText(intro)).toBeNull();
    await fireEvent(procedures, "pressIn");
    expect(await screen.findByText(intro)).toBeOnTheScreen();
    // The release changes nothing: the tab stays as it opened.
    await fireEvent(procedures, "press");
    expect(screen.getByText(intro)).toBeOnTheScreen();
    expect(procedures).toBeSelected();
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
    expect(await screen.findByRole("header", { name: "Bic Gouv Sn" })).toBeOnTheScreen();
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

  it("hides an article the source withdrew, even its saved copy", async () => {
    await AsyncStorage.setItem(
      "bgs-favorites-v1",
      JSON.stringify([{ detail: DETAIL, savedAt: "2026-09-26T08:00:00Z" }]),
    );
    globalThis.fetch = newsFetch({
      detail: () => new Response(JSON.stringify({ code: "NEWS_WITHDRAWN" }), { status: 410 }),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: `/article/${DETAIL.id}` });
    expect(
      await screen.findByText("Cet article a été retiré de son site d'origine."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Paragraphe de test.")).toBeNull();
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("bgs-favorites-v1")).not.toContain(DETAIL.id);
    });
  });

  it("shows how to keep articles when there is no favorite yet", async () => {
    await renderRouter(routes, { initialUrl: "/favorites" });
    expect(
      await screen.findByText(/Touchez le marque-page d'un article pour le garder/),
    ).toBeOnTheScreen();
  });

  it("sends usage statistics only once turned on, anonymous, and forgets them when off", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    // The fake server is typed for GET requests: the body of a POST is read as sent.
    const sentSignals = () =>
      (fetchMock.mock.calls as unknown as [string, RequestInit | undefined][])
        .filter(([url]) => url.includes("/v1/stats"))
        .flatMap(
          ([, init]) =>
            (JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { signals: object[] })
              .signals,
        );
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    // Off by default: nothing has left the phone.
    expect(screen.getByRole("radio", { name: "Non", checked: true })).toBeOnTheScreen();
    expect(sentSignals()).toEqual([]);
    await fireEvent.press(
      screen.getByRole("radio", { name: "Oui, envoyer des statistiques anonymes" }),
    );
    await waitFor(() => {
      expect(sentSignals()).toEqual([
        expect.objectContaining({ type: "active", firstEver: true, platform: "ios" }),
      ]);
    });
    // Nothing that could single anyone out.
    expect(Object.keys(sentSignals()[0] ?? {}).sort()).toEqual([
      "appVersion",
      "firstEver",
      "firstThisMonth",
      "firstThisWeek",
      "osVersion",
      "platform",
      "returnedAfterDays",
      "type",
    ]);
    await fireEvent.press(screen.getByRole("button", { name: "Fermer les réglages" }));
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
    expect(sentSignals()).toContainEqual({ type: "read", articleId: DETAIL.id });
  });

  it("asks on arriving at the front page, one after the other; yes turns statistics on at once", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const statsCalls = () => fetchMock.mock.calls.filter(([url]) => url.includes("/v1/stats"));
    await renderRouter(routes, { initialUrl: "/" });
    // The front page first, the invitations a moment later, without any reading.
    expect(await screen.findAllByText("Titre de test A")).not.toHaveLength(0);
    expect(screen.queryByText("Voir les services près de vous\u00a0?")).toBeNull();
    expect(
      await screen.findByText("Voir les services près de vous\u00a0?", {}, { timeout: 3000 }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Non merci" }));
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("bgs-location-invited")).toBe("yes");
    // Right after, in the same card: the anonymous statistics.
    expect(await screen.findByText("Aider à améliorer l'application\u00a0?")).toBeOnTheScreen();
    expect(statsCalls()).toHaveLength(0);
    await fireEvent.press(screen.getByRole("button", { name: "Oui, j'accepte" }));
    // On at once: today's anonymous signal leaves without visiting the settings.
    await waitFor(() => {
      expect(statsCalls()).toHaveLength(1);
    });
    expect(await AsyncStorage.getItem("bgs-usage-stats")).toBe("on");
    expect(screen.queryByText("Aider à améliorer l'application\u00a0?")).toBeNull();
    expect(await AsyncStorage.getItem("bgs-usage-invited")).toBe("yes");
  });

  it("finds the position at once when the person allows it, for « Près de moi »", async () => {
    jest
      .mocked(Location.requestForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getLastKnownPositionAsync)
      .mockResolvedValue({ coords: { latitude: 14.7, longitude: -17.4 } } as never);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(
      await screen.findByRole("button", { name: "Oui, me localiser" }, { timeout: 3000 }),
    );
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    await act(() => {
      router.push("/near-me");
    });
    // Ranked from the position already found: no tap on « Utiliser ma position ».
    expect(await screen.findByText("Autour de votre position")).toBeOnTheScreen();
  });

  it("does not ask again once the person said no", async () => {
    await AsyncStorage.multiSet([
      ["bgs-usage-invited", "yes"],
      ["bgs-location-invited", "yes"],
    ]);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(first(await screen.findAllByText("Titre de test A")));
    expect(await screen.findByText("Paragraphe de test.")).toBeOnTheScreen();
    await act(() => {
      router.back();
    });
    expect(await screen.findAllByText("Titre de test A")).not.toHaveLength(0);
    expect(screen.queryByText("Aider à améliorer l'application\u00a0?")).toBeNull();
  });

  it("erases what the phone kept for statistics when they are turned off", async () => {
    await AsyncStorage.multiSet([
      ["bgs-usage-stats", "on"],
      [
        "bgs-usage-memory",
        JSON.stringify({ firstDay: "2026-09-28", lastDay: null, lastWeek: null, lastMonth: null }),
      ],
    ]);
    await renderRouter(routes, { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Réglages" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Non" }));
    expect(await AsyncStorage.getItem("bgs-usage-memory")).toBeNull();
    expect(await AsyncStorage.getItem("bgs-usage-stats")).toBe("off");
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

  it("welcomes under the official mark, then answers in a conversation with its sources", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/assistant" });
    expect(
      await screen.findByText(/^Posez une question ou vérifiez une information. Réponses fondées/),
    ).toBeOnTheScreen();
    const field = screen.getByLabelText("Posez une question ou vérifiez une information");
    await fireEvent.changeText(field, "Une question fictive ?");
    const dismiss = jest.spyOn(Keyboard, "dismiss");
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    // The keyboard goes away so the whole discussion can be read.
    expect(dismiss).toHaveBeenCalled();
    expect(screen.getByText("Une question fictive ?")).toBeOnTheScreen();
    expect(
      await screen.findByText("Une réponse fictive tirée de la démarche de test."),
    ).toBeOnTheScreen();
    // The welcome words leave once the conversation has begun.
    expect(
      screen.queryByText(/^Posez une question ou vérifiez une information. Réponses fondées/),
    ).toBeNull();
    const sent = fetchMock.mock.calls.find(([url]) => url.includes("/v1/assistant/answers"));
    const init = (sent as unknown as [string, RequestInit] | undefined)?.[1];
    expect(JSON.parse(init?.body as string)).toEqual({
      question: "Une question fictive ?",
      mode: "ask",
      lang: "fr",
    });
    await fireEvent.press(
      screen.getByRole("button", { name: /^Démarche : Démarche fictive citée/ }),
    );
    expect(await screen.findByRole("header", { name: "Démarche de test A" })).toBeOnTheScreen();
  });

  it("says kindly when the month's messages are used up, and starts a new discussion", async () => {
    const paused = { status: "paused", text: null, sources: [], resumesOn: "2026-11-01" };
    globalThis.fetch = newsFetch({
      assistant: () => new Response(JSON.stringify(paused)),
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/assistant" });
    await fireEvent.changeText(
      await screen.findByLabelText("Posez une question ou vérifiez une information"),
      "Une information fictive à vérifier.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText("L'assistant fait une pause")).toBeOnTheScreen();
    expect(screen.getByText(/disponible le 1er novembre 2026/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Nouvelle discussion" }));
    expect(screen.queryByText("L'assistant fait une pause")).toBeNull();
    expect(
      screen.getByText(/^Posez une question ou vérifiez une information. Réponses fondées/),
    ).toBeOnTheScreen();
  });

  it("offers other ways when the sources say nothing, and a retry when offline", async () => {
    const notFound = { status: "not_found", text: null, sources: [], resumesOn: null };
    let offline = false;
    globalThis.fetch = newsFetch({
      assistant: () => {
        if (offline) {
          throw new TypeError("Network request failed");
        }
        return new Response(JSON.stringify(notFound));
      },
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/assistant" });
    const field = await screen.findByLabelText("Posez une question ou vérifiez une information");
    await fireEvent.changeText(field, "Une question sans réponse ?");
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(
      await screen.findByText(/^Les sources officielles ne contiennent pas d'information/),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Écrire au gouvernement" })).toBeOnTheScreen();
    offline = true;
    await fireEvent.changeText(field, "Une autre question ?");
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    expect(await screen.findByText(/^Pas de connexion/)).toBeOnTheScreen();
    offline = false;
    await fireEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    expect(
      await screen.findAllByText(/^Les sources officielles ne contiennent pas d'information/),
    ).toHaveLength(2);
  });

  it("offers to try again when the assistant is unavailable for a moment", async () => {
    const unavailable = { status: "unavailable", text: null, sources: [], resumesOn: null };
    let busy = true;
    globalThis.fetch = newsFetch({
      assistant: () => {
        if (busy) {
          busy = false;
          return new Response(JSON.stringify(unavailable));
        }
        return new Response(
          JSON.stringify({
            status: "answered",
            text: "Réponse fictive.",
            sources: [],
            resumesOn: null,
          }),
        );
      },
    }) as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/assistant" });
    await fireEvent.changeText(
      await screen.findByLabelText("Posez une question ou vérifiez une information"),
      "Une question fictive ?",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Envoyer" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Réponse fictive.")).toBeOnTheScreen();
  });

  it("says dictation comes with the next version where this build cannot listen", async () => {
    globalThis.fetch = newsFetch() as unknown as typeof fetch;
    await renderRouter(routes, { initialUrl: "/assistant" });
    await fireEvent.press(await screen.findByRole("button", { name: "Dicter votre message" }));
    expect(
      screen.getByText("La dictée arrive avec la prochaine version de l'application."),
    ).toBeOnTheScreen();
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

  it("shows the nearest service beside the list on a wide window, then the one chosen", async () => {
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 1024, height: 768 } });
    try {
      await renderRouter(routes, { initialUrl: "/near-me" });
      const list = () => within(screen.getByTestId("near-me-list"));
      await fireEvent.press(await list().findByRole("button", { name: "Choisir une ville" }));
      await fireEvent.changeText(list().getByLabelText("Rechercher une ville"), "ville de");
      await fireEvent.press(list().getByRole("button", { name: "Ville de test" }));
      // The nearest opens beside the list, without navigating.
      expect(
        await screen.findByRole("header", { name: "Commissariat de test proche" }),
      ).toBeOnTheScreen();
      expect(list().getByRole("button", { name: /^Commissariat de test proche/ })).toBeSelected();
      await fireEvent.press(list().getByRole("button", { name: /^Tribunal de test/ }));
      expect(await screen.findByRole("header", { name: "Tribunal de test" })).toBeOnTheScreen();
      expect(list().getByRole("button", { name: /^Tribunal de test/ })).toBeSelected();
    } finally {
      await act(() => {
        Dimensions.set({ window: phone });
      });
    }
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

  it("opens on the map, then shows the service touched in the panel, and the way there", async () => {
    mockMapAvailable = true;
    // A phone held upright: the sliding panel, not the side panel.
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
    // The map leads: no button to press (decision of 30/09/2026).
    const map = await screen.findByTestId("service-map");
    expect(screen.queryByTestId("near-me-side-panel")).toBeNull();
    // The base map comes from our API, always the light one.
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
    const drawn = points.props as {
      data: { features: { properties: { category: string } }[] };
    };
    expect(drawn.data.features).toHaveLength(3);
    // Each point carries its kind, drawn with that kind's marker (tone and icon).
    const images = String(screen.getByTestId("map-images").props["accessibilityHint"]);
    for (const feature of drawn.data.features) {
      expect(images.split(",")).toContain(feature.properties.category);
    }
    expect(images).toBe("administration,gendarmerie,mairie,ministere,police,prefecture,tribunal");

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
    // The panel shows the whole service at once, hours included.
    expect(await screen.findByText(/^Du lundi au vendredi, de 8.h à 17.h.$/)).toBeOnTheScreen();
    // Back to the list from the panel, or by touching the map itself.
    await fireEvent.press(screen.getByRole("button", { name: "Retour à la liste" }));
    expect(screen.queryByRole("header", { name: "Commissariat de test proche" })).toBeNull();
    await fireEvent.press(
      points,
      touchOnPoints({ id: "osm-n2", name: "Commissariat de test proche" }, [-17.4, 14.701]),
    );
    expect(
      await screen.findByRole("header", { name: "Commissariat de test proche" }),
    ).toBeOnTheScreen();
    await fireEvent.press(map);
    expect(screen.queryByRole("button", { name: "Retour à la liste" })).toBeNull();
    openURL.mockRestore();
  });

  it("keeps the services in a panel fixed beside the map on a wide window", async () => {
    mockMapAvailable = true;
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 1024, height: 768 } });
    try {
      await renderRouter(routes, { initialUrl: "/near-me" });
      await screen.findByTestId("service-map");
      // The same list, beside the map: no sliding panel on a large screen.
      expect(await screen.findByTestId("near-me-side-panel")).toBeOnTheScreen();
      const list = within(await screen.findByTestId("near-me-sheet-list"));
      await fireEvent.press(list.getByRole("button", { name: /^Commissariat de test proche/ }));
      expect(
        await screen.findByRole("header", { name: "Commissariat de test proche" }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("adjustable", { name: "Panneau des services" })).toBeNull();
      await fireEvent.press(screen.getByRole("button", { name: "Retour à la liste" }));
      expect(await screen.findByTestId("near-me-sheet-list")).toBeOnTheScreen();
    } finally {
      Dimensions.set({ window: phone });
    }
  });

  it("keeps the panel beside the map on a phone turned sideways", async () => {
    mockMapAvailable = true;
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 844, height: 390 } });
    try {
      await renderRouter(routes, { initialUrl: "/near-me" });
      await screen.findByTestId("service-map");
      expect(await screen.findByTestId("near-me-side-panel")).toBeOnTheScreen();
      const list = within(await screen.findByTestId("near-me-sheet-list"));
      await fireEvent.press(list.getByRole("button", { name: /^Commissariat de test proche/ }));
      // A sliding panel would leave a strip a hundred points high: the list sits beside.
      expect(
        await screen.findByRole("header", { name: "Commissariat de test proche" }),
      ).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Retour à la liste" })).toBeOnTheScreen();
      // Location refused: the message stays clear of the panel and offers nothing
      // to open, the town search being already in view beside it.
      jest
        .mocked(Location.requestForegroundPermissionsAsync)
        .mockResolvedValueOnce({ granted: false } as never);
      await fireEvent.press(screen.getByRole("button", { name: "Me localiser sur la carte" }));
      expect(await screen.findByText(/La localisation n'est pas autorisée/)).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Choisir une ville" })).toBeNull();
    } finally {
      Dimensions.set({ window: phone });
    }
  });

  it("opens a group of nearby services by zooming in on it", async () => {
    mockMapAvailable = true;
    await renderRouter(routes, { initialUrl: "/near-me" });
    await screen.findByText("Commissariat de test proche");
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
    expect(screen.queryByRole("button", { name: "Retour à la liste" })).toBeNull();
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
    await fireEvent(await screen.findByTestId("service-map"), "didFailLoadingMap");
    // The list alone, with the reason why.
    expect(await screen.findByText(/La carte n'a pas pu s'afficher/)).toBeOnTheScreen();
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

  it("shows a theme's list and the chosen procedure side by side on a wide window", async () => {
    const fetchMock = newsFetch();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 1024, height: 768 } });
    try {
      await renderRouter(routes, { initialUrl: "/procedure-theme/a1" });
      // The first procedure of the list opens beside it, without navigating.
      expect(await screen.findByText("Public de test.")).toBeOnTheScreen();
      const list = () => within(screen.getByTestId("theme-list"));
      const rowB = await list().findByRole("button", { name: "Démarche de test B" });
      expect(rowB).not.toBeSelected();
      await fireEvent.press(rowB);
      await waitFor(() => {
        expect(
          fetchMock.mock.calls.some(([url]) => url.includes("/v1/procedures/demarche-test-b")),
        ).toBe(true);
      });
      expect(list().getByRole("button", { name: "Démarche de test B" })).toBeSelected();
      // Still the theme's screen: its list stays in place beside the sheet.
      expect(list().getByText("Démarche de test A")).toBeOnTheScreen();
    } finally {
      await act(() => {
        Dimensions.set({ window: phone });
      });
    }
  });

  it("shows search results beside the first procedure found, theme cards in full width", async () => {
    const phone = Dimensions.get("window");
    Dimensions.set({ window: { ...phone, width: 1024, height: 768 } });
    try {
      await renderRouter(routes, { initialUrl: "/procedures" });
      expect(
        await screen.findByRole("button", { name: "Transports. 3 démarches" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Public de test.")).toBeNull();
      const search = screen.getByLabelText("Rechercher une démarche");
      await fireEvent.changeText(search, "test");
      expect(await screen.findByText("Public de test.", {}, { timeout: 3000 })).toBeOnTheScreen();
      // The search field is the same one: what was typed is still there.
      expect(screen.getByLabelText("Rechercher une démarche")).toHaveDisplayValue("test");
    } finally {
      await act(() => {
        Dimensions.set({ window: phone });
      });
    }
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
