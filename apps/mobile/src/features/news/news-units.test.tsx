import { fireEvent, render, screen } from "@testing-library/react-native";
import type { Block } from "@bgs/shared-types";
import * as Speech from "expo-speech";
import { Linking, StyleSheet } from "react-native";
import { createNewsClient, NewsApiError } from "../../api/news-client";
import { I18nProvider } from "../../i18n/I18nProvider";
import { COVER, DETAIL, LIST } from "../../testing/news-fixtures";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ArticleView } from "./ArticleView";
import { BlockRenderer } from "./BlockRenderer";
import { categoryLabelKey } from "./category";
import { pickCoverSource } from "./CoverImage";
import { formatDay, formatPublishedOn, freshnessOf, parseCalendarDate } from "./format";
import { heroStories, orderSections } from "./front-page";
import { spokenPieces } from "./spoken-text";
import { CouncilCard, LeadStory, StoryRow } from "./Stories";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
// Screens here render outside a navigator: they are always "focused".
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  maxSpeechInputLength: 4000,
}));

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
      fetchImpl: respond({ ...LIST, pageCount: 2 }),
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

describe("reading an article aloud", () => {
  const view = (detail: typeof DETAIL) =>
    render(
      <ThemeProvider>
        <I18nProvider>
          <ArticleView detail={detail} isPending={false} paneWidth={390} bottomInset={0} />
        </I18nProvider>
      </ThemeProvider>,
    );

  it("reads the title, then the text in order, skipping pictures", () => {
    const blocks: Block[] = [
      { type: "heading", level: 2, inlines: [{ text: "Intertitre" }] },
      { type: "image", src: "https://bo-admin.presidence.sn/storage/x.jpg", alt: null },
      { type: "paragraph", inlines: [{ text: "Un " }, { text: "paragraphe", bold: true }] },
      { type: "list", ordered: false, items: [[{ text: "Point" }]] },
    ];
    expect(spokenPieces("Titre", blocks, 4000)).toEqual([
      "Titre",
      "Intertitre",
      "Un paragraphe",
      "Point",
    ]);
  });

  it("cuts a long text after sentences to fit one reading", () => {
    const long = "Première phrase assez longue. Deuxième phrase assez longue. Troisième.";
    const pieces = spokenPieces("T", [{ type: "paragraph", inlines: [{ text: long }] }], 40);
    expect(pieces).toEqual([
      "T",
      "Première phrase assez longue.",
      // Exactly 40 characters: fits one reading.
      "Deuxième phrase assez longue. Troisième.",
    ]);
    expect(pieces.every((piece) => piece.length <= 40)).toBe(true);
  });

  it("offers Écouter on the photo of a French article, then Arrêter", async () => {
    await view(DETAIL);
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    expect(Speech.speak).toHaveBeenCalledWith(
      DETAIL.title,
      expect.objectContaining({ language: "fr-FR" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Arrêter" }));
    expect(Speech.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Écouter" })).toBeOnTheScreen();
  });

  it("offers no voice for a Wolof article (no phone has one yet)", async () => {
    await view({ ...DETAIL, lang: "wo" });
    expect(screen.queryByRole("button", { name: "Écouter" })).toBeNull();
  });
});

describe("ArticleView cover", () => {
  async function coverStyle(paneWidth: number) {
    await render(
      <ThemeProvider>
        <I18nProvider>
          <ArticleView detail={DETAIL} isPending={false} paneWidth={paneWidth} bottomInset={0} />
        </I18nProvider>
      </ThemeProvider>,
    );
    const cover = screen.getByTestId("cover-image", { includeHiddenElements: true });
    return StyleSheet.flatten(cover.props["style"] as Parameters<typeof StyleSheet.flatten>[0]);
  }

  // Regression: on phones the photo left a gap on the right (width inferred natively).
  it("spans the whole screen width on phones", async () => {
    expect(await coverStyle(390)).toMatchObject({ width: 390, marginLeft: -16 });
  });

  it("stays framed in the reading column on wide panes", async () => {
    expect(await coverStyle(1000)).toMatchObject({ width: "100%", marginLeft: 0 });
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
          {kind === "lead" && <LeadStory {...props} width={390} />}
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

describe("front page", () => {
  const story = (id: string, category = "communiques", pictured = true) =>
    ({
      ...LIST.items[0],
      id,
      category,
      cover: pictured ? COVER : null,
    }) as (typeof LIST.items)[number];

  it("puts the newest pictured stories in the carousel", () => {
    const items = [story("a", "agenda", false), story("b"), story("c"), story("d")];
    expect(heroStories(items, 2).map((item) => item.id)).toEqual(["b", "c"]);
  });

  it("falls back to the newest story when none has a photo", () => {
    expect(heroStories([story("a", "agenda", false), story("b", "agenda", false)])).toHaveLength(1);
    expect(heroStories([])).toEqual([]);
  });

  it("orders the rows like the official site, unknown sections last, empty ones out", () => {
    const row = (category: string, items: unknown[] = [1]) => ({ category, items });
    const ordered = orderSections([
      row("inconnue"),
      row("international"),
      row("agenda", []),
      row("conseil-des-ministres"),
      row("communiques"),
    ]);
    expect(ordered.map((section) => section.category)).toEqual([
      "conseil-des-ministres",
      "communiques",
      "international",
      "inconnue",
    ]);
  });
});

describe("freshnessOf", () => {
  const now = Date.parse("2026-09-26T12:00:00Z");
  it.each([
    [30_000, { unit: "now" }],
    [5 * 60_000, { unit: "minutes", count: 5 }],
    [3 * 3_600_000 + 59_000, { unit: "hours", count: 3 }],
    [2 * 86_400_000, { unit: "days", count: 2 }],
  ])("describes data fetched %i ms ago", (age, expected) => {
    expect(freshnessOf(now - age, now)).toEqual(expected);
  });

  it("never reports a negative age (clock changed)", () => {
    expect(freshnessOf(now + 60_000, now)).toEqual({ unit: "now" });
  });
});
