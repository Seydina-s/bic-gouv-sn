import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import RootLayout from "./app/_layout";
import HomeScreen from "./app/index";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
jest.mock("expo-system-ui", () => ({ setBackgroundColorAsync: jest.fn(() => Promise.resolve()) }));

describe("app shell", () => {
  it("opens on the home screen with theme and translations wired", async () => {
    await renderRouter({ _layout: RootLayout, index: HomeScreen }, { initialUrl: "/" });
    expect(screen.getByRole("header")).toHaveTextContent("Accueil");
  });
});
