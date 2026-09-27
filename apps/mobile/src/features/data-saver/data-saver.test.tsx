import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { NetworkStateType } from "expo-network";
import { COVER } from "../../testing/news-fixtures";
import { TestProviders } from "../../testing/TestProviders";
import { CoverImage, pickCoverSource } from "../news/CoverImage";
import { savesData } from "./DataSaverProvider";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

function shownUrl(): unknown {
  // A photo without a label is decorative, hence hidden from screen readers.
  const image = screen.getByTestId("cover-image", { includeHiddenElements: true });
  const source: unknown = image.props["source"];
  return Array.isArray(source) ? (source[0] as { uri?: string } | undefined)?.uri : source;
}

describe("data saver", () => {
  it("saves data always, never, or on a mobile network only", () => {
    expect(savesData("always", NetworkStateType.WIFI)).toBe(true);
    expect(savesData("never", NetworkStateType.CELLULAR)).toBe(false);
    expect(savesData("cellular", NetworkStateType.CELLULAR)).toBe(true);
    expect(savesData("cellular", NetworkStateType.WIFI)).toBe(false);
    expect(savesData("cellular", undefined)).toBe(false);
  });

  it("picks the lightest variant when saving data, whatever the slot", () => {
    expect(pickCoverSource(COVER, 400, 3, true)?.url).toBe(
      "https://api.test/media/images/a/480.webp",
    );
    expect(pickCoverSource(COVER, 400, 3)?.url).toBe("https://api.test/media/images/a/960.webp");
  });

  it("keeps a photo back until asked for, then loads its lightest variant", async () => {
    await AsyncStorage.setItem("bgs-data-saver", "always");
    await render(
      <TestProviders>
        <CoverImage cover={COVER} slotWidth={400} onDemand label="Photo de test" />
      </TestProviders>,
    );
    await fireEvent.press(await screen.findByRole("button", { name: "Afficher la photo" }));
    expect(shownUrl()).toBe("https://api.test/media/images/a/480.webp");
    expect(screen.queryByRole("button", { name: "Afficher la photo" })).toBeNull();
  });

  it("loads photos as usual when data saving is off", async () => {
    await render(
      <TestProviders>
        <CoverImage cover={COVER} slotWidth={400} onDemand />
      </TestProviders>,
    );
    expect(screen.queryByRole("button", { name: "Afficher la photo" })).toBeNull();
    expect(shownUrl()).toBeTruthy();
  });
});
