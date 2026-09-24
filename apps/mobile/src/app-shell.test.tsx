import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "./app/_layout";
import HomeScreen from "./app/index";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

let mockFontState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({ useFonts: () => mockFontState }));

beforeEach(() => {
  mockFontState = [true, null];
});

describe("app shell", () => {
  it("opens on the home screen with theme and translations wired", async () => {
    await renderRouter({ _layout: RootLayout, index: HomeScreen }, { initialUrl: "/" });
    expect(screen.getByRole("header")).toHaveTextContent("Accueil");
  });

  it("keeps the splash screen while fonts load", async () => {
    mockFontState = [false, null];
    await renderRouter({ _layout: RootLayout, index: HomeScreen }, { initialUrl: "/" });
    expect(screen.queryByRole("header")).toBeNull();
  });

  it("still opens with system fonts if font loading fails", async () => {
    mockFontState = [false, new Error("font download failed")];
    await renderRouter({ _layout: RootLayout, index: HomeScreen }, { initialUrl: "/" });
    expect(screen.getByRole("header")).toHaveTextContent("Accueil");
  });
});
