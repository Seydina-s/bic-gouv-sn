import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { createNewsClient, NewsApiError } from "../../api/news-client";
import { I18nProvider } from "../../i18n/I18nProvider";
import { DETAIL, LIST } from "../../testing/news-fixtures";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BlockRenderer } from "./BlockRenderer";
import { categoryLabelKey } from "./category";
import { formatDay, formatPublishedOn, parseCalendarDate } from "./format";

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
