import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { createNewsClient, NewsApiError } from "../../api/news-client";
import { I18nProvider } from "../../i18n/I18nProvider";
import { COVER, DETAIL, LIST } from "../../testing/news-fixtures";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BlockRenderer } from "./BlockRenderer";
import { categoryLabelKey } from "./category";
import { pickCoverSource } from "./CoverImage";
import { formatDay, formatPublishedOn, parseCalendarDate } from "./format";
import { NewsBand } from "./NewsBand";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));

function respond(body: unknown, status = 200) {
  return jest.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("createNewsClient", () => {
  it("requests the feed with language, page size and cursor", async () => {
    const fetchImpl = respond(LIST);
    const client = createNewsClient({
      baseUrl: "https://api.test",
      fetchImpl: fetchImpl,
    });
    await client.listNews("wo", "abc");
    expect(fetchImpl.mock.calls[0]).toEqual(
      expect.arrayContaining(["https://api.test/v1/news?lang=wo&limit=20&cursor=abc"]),
    );
  });

  it("validates the article it receives", async () => {
    const client = createNewsClient({
      baseUrl: "",
      fetchImpl: respond(DETAIL),
    });
    await expect(client.getNews(DETAIL.id, "fr")).resolves.toEqual(DETAIL);
  });

  it("rejects an HTTP error and an unexpected body", async () => {
    const failing = createNewsClient({
      baseUrl: "",
      fetchImpl: respond({}, 404),
    });
    await expect(failing.getNews("x", "fr")).rejects.toMatchObject({ status: 404 });
    const odd = createNewsClient({
      baseUrl: "",
      fetchImpl: respond({ items: "no" }),
    });
    await expect(odd.listNews("fr", null)).rejects.toBeInstanceOf(NewsApiError);
  });
});

describe("format", () => {
  it("parses a calendar day without time zone shift", () => {
    const date = parseCalendarDate("2026-09-24");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 24]);
  });

  it("formats the day in French, capitalised", () => {
    expect(formatDay(parseCalendarDate("2026-09-24"), "fr")).toEqual({
      weekday: "Jeudi",
      date: "24 septembre",
    });
    expect(formatPublishedOn("2026-09-24", "wo")).toBe("24 septembre 2026");
    expect(formatPublishedOn(null, "fr")).toBe("");
  });

  it("maps unknown sections to the general label", () => {
    expect(categoryLabelKey("discours")).toBe("categories.discours");
    expect(categoryLabelKey("nouvelle-rubrique")).toBe("categories.general");
  });
});

describe("BlockRenderer", () => {
  it("renders every block type natively and opens links", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(
      <ThemeProvider>
        <I18nProvider>
          <BlockRenderer blocks={DETAIL.blocks} />
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("Paragraphe de test.")).toBeOnTheScreen();
    expect(screen.getByRole("header")).toHaveTextContent("Intertitre");
    expect(screen.getByText("1.")).toBeOnTheScreen();
    expect(screen.getByText("•")).toBeOnTheScreen();
    expect(screen.getByText("Citation")).toBeOnTheScreen();
    expect(screen.getByLabelText("Photo de l'article")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Lien"));
    expect(openURL).toHaveBeenCalledWith("https://www.presidence.sn/fr/");
  });
});

describe("pickCoverSource", () => {
  it("picks the smallest WebP sharp enough for the slot on this screen", () => {
    expect(pickCoverSource(COVER, 72, 3)?.url).toMatch(/480\.webp$/);
    expect(pickCoverSource(COVER, 360, 2)?.url).toMatch(/960\.webp$/);
  });

  it("falls back to the widest source, then to another format", () => {
    expect(pickCoverSource(COVER, 800, 3)?.url).toMatch(/960\.webp$/);
    const jpegOnly = { ...COVER, sources: COVER.sources.filter((s) => s.format === "jpeg") };
    expect(pickCoverSource(jpegOnly, 72, 2)?.url).toMatch(/480\.jpg$/);
    const avifOnly = { ...COVER, sources: COVER.sources.filter((s) => s.format === "avif") };
    expect(pickCoverSource(avifOnly, 72, 2)?.url).toMatch(/480\.avif$/);
  });
});

describe("NewsBand", () => {
  async function band(lead: boolean, cover: typeof COVER | null) {
    const item = { ...LIST.items[0], cover } as (typeof LIST.items)[number];
    await render(
      <ThemeProvider>
        <I18nProvider>
          <NewsBand item={item} lead={lead} lastOpened={false} onPress={jest.fn()} />
        </I18nProvider>
      </ThemeProvider>,
    );
  }

  it("shows the official photo, decorative, on lead and regular bands", async () => {
    await band(true, COVER);
    expect(screen.getByTestId("cover-image", { includeHiddenElements: true })).toBeOnTheScreen();
    await screen.unmount();
    await band(false, COVER);
    expect(screen.getByTestId("cover-image", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("shows no photo frame when the article has none", async () => {
    await band(true, null);
    expect(screen.queryByTestId("cover-image", { includeHiddenElements: true })).toBeNull();
  });
});
