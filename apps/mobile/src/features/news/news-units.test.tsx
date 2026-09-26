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
import { composeFrontPage } from "./front-page";
import { CouncilCard, LeadStory, StoryRow } from "./Stories";

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

  it("still reads a newer API that added fields and block types (regression 25/09/2026)", async () => {
    const newer = {
      ...DETAIL,
      audio: [{ lang: "wo" }],
      blocks: [{ type: "podcast", url: "https://cdn.test/p.mp3" }, ...DETAIL.blocks],
    };
    const client = createNewsClient({ baseUrl: "", fetchImpl: respond(newer) });
    await expect(client.getNews(DETAIL.id, "fr")).resolves.toEqual(DETAIL);
    const list = createNewsClient({
      baseUrl: "",
      fetchImpl: respond({ ...LIST, total: 2 }),
    });
    await expect(list.listNews("fr", null)).resolves.toEqual(LIST);
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

  it("opens an official video in YouTube only when the reader taps it", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    openURL.mockClear();
    await render(
      <ThemeProvider>
        <I18nProvider>
          <BlockRenderer
            blocks={[
              {
                type: "video",
                provider: "youtube",
                videoId: "UMZm4iPcFWE",
                url: "https://www.youtube.com/watch?v=UMZm4iPcFWE",
              },
            ]}
          />
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(openURL).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("link", { name: "Regarder la vidéo. Sur YouTube" }));
    expect(openURL).toHaveBeenCalledWith("https://www.youtube.com/watch?v=UMZm4iPcFWE");
  });

  it("shows our stored copy of an image in the text, with its description", async () => {
    await render(
      <ThemeProvider>
        <I18nProvider>
          <BlockRenderer
            blocks={[
              {
                type: "image",
                src: "https://bo-admin.presidence.sn/uploads/images/in.jpg",
                alt: "Salle du Conseil",
                media: COVER,
              },
            ]}
          />
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("Salle du Conseil")).toHaveProp("testID", "cover-image");
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

describe("stories", () => {
  async function show(kind: "lead" | "row" | "council", cover: typeof COVER | null) {
    const item = { ...LIST.items[0], cover } as (typeof LIST.items)[number];
    const onPress = jest.fn();
    const props = { item, lastOpened: true, onPress };
    await render(
      <ThemeProvider>
        <I18nProvider>
          {kind === "lead" && <LeadStory {...props} />}
          {kind === "row" && <StoryRow {...props} />}
          {kind === "council" && <CouncilCard item={item} onPress={onPress} />}
        </I18nProvider>
      </ThemeProvider>,
    );
    return onPress;
  }

  it("shows the official photo, decorative, on the lead story and in the list", async () => {
    await show("lead", COVER);
    expect(screen.getByTestId("cover-image", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("24 septembre 2026 · presidence.sn")).toBeOnTheScreen();
    await screen.unmount();
    await show("row", COVER);
    expect(screen.getByTestId("cover-image", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("Dernière lecture")).toBeOnTheScreen();
  });

  it("shows no photo frame when the article has none", async () => {
    await show("lead", null);
    expect(screen.queryByTestId("cover-image", { includeHiddenElements: true })).toBeNull();
  });

  it("opens the latest Conseil des ministres from its card", async () => {
    const onPress = await show("council", null);
    expect(screen.getByText("Dernier Conseil des ministres")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Lire le communiqué"));
    expect(onPress).toHaveBeenCalledWith(LIST.items[0]?.id);
  });
});

describe("composeFrontPage", () => {
  const story = (id: string, category = "communiques") =>
    ({ ...LIST.items[0], id, category }) as (typeof LIST.items)[number];

  it("leads with the newest story and lifts the latest council into its card", () => {
    const rows = composeFrontPage([
      story("a"),
      story("b"),
      story("c", "conseil-des-ministres"),
      story("d", "conseil-des-ministres"),
    ]);
    expect(rows.map((row) => `${row.kind}:${row.item.id}`)).toEqual([
      "lead:a",
      "council:c",
      "story:b",
      "story:d",
    ]);
  });

  it("never shows the same council twice when it already leads", () => {
    const rows = composeFrontPage([story("c", "conseil-des-ministres"), story("b")]);
    expect(rows.map((row) => row.kind)).toEqual(["lead", "story"]);
  });

  it("shows the latest council from its own query when it is older than the loaded pages", () => {
    const older = story("old", "conseil-des-ministres");
    const rows = composeFrontPage([story("a"), story("b")], older);
    expect(rows.map((row) => `${row.kind}:${row.item.id}`)).toEqual([
      "lead:a",
      "council:old",
      "story:b",
    ]);
    const leading = composeFrontPage([older, story("b")], older);
    expect(leading.map((row) => row.kind)).toEqual(["lead", "story"]);
  });

  it("is empty without news", () => {
    expect(composeFrontPage([])).toEqual([]);
  });
});
