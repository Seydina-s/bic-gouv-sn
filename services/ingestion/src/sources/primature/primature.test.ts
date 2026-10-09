import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { USER_AGENT } from "../../lib/polite-http";
import { primatureArticleId, primatureArticleUrl } from "./normalize";
import { frenchDate } from "../../lib/french-date";
import { parseArticlePage, parseListingPage } from "./parse";
import { createPrimatureProvider } from "./primature-provider";

// Pages saved from primature.sn on 09/10/2026 (docs/sources.md).
const fixture = (name: string) =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const NEWEST = fixture("list-page-0.html");
const OLDEST = fixture("list-page-41.html");
const COUNCIL = fixture("article-conseil-30-09-2026.html");
const COUNCIL_SLUG = "conseil-des-ministres-du-30-septembre-2026";

describe("frenchDate", () => {
  it.each([
    ["30 sep 2026", "2026-09-30"],
    [" 06 juin 2021 ", "2021-06-06"],
    ["05 avr 2022", "2022-04-05"],
    ["1 août 2025", "2025-08-01"],
    ["8 août 2026", "2026-08-08"],
    ["1er octobre 2025", "2025-10-01"],
    ["25 juillet 2026", "2026-07-25"],
  ])("reads %s", (text, day) => {
    expect(frenchDate(text)).toBe(day);
  });

  it.each(["31 sep 2026", "30 brumaire 2026", "2026-09-30", ""])("never guesses %s", (text) => {
    expect(frenchDate(text)).toBeNull();
  });
});

describe("parseListingPage", () => {
  it("reads the newest page: nine items with their day and full-size photo", () => {
    const page = parseListingPage(NEWEST);
    expect(page.lastPageIndex).toBe(41);
    expect(page.items).toHaveLength(9);
    expect(page.items[3]).toEqual({
      slug: COUNCIL_SLUG,
      publishedOn: "2026-09-30",
      coverUrl: "https://primature.sn/sites/default/files/2026-09/GOUV%20ALAMLO1_1.jpg",
    });
  });

  it("reads the oldest page, back to 2021", () => {
    const page = parseListingPage(OLDEST);
    expect(page.items.map((item) => item.publishedOn)).toEqual([
      "2022-04-05",
      "2022-03-10",
      "2021-10-11",
      "2021-06-06",
      "2021-06-03",
    ]);
  });

  it("finds nothing in a page that is not a listing", () => {
    expect(parseListingPage("<html><body><p>Maintenance</p></body></html>")).toEqual({
      items: [],
      lastPageIndex: 0,
    });
  });
});

describe("parseArticlePage", () => {
  it("reads the title, the body with absolute links, and the original photo", () => {
    const page = parseArticlePage(COUNCIL);
    expect(page?.title).toBe("Conseil des ministres du 30 septembre 2026");
    expect(page?.bodyHtml).toContain(
      "Le Conseil des Ministres s’est tenu le mercredi 30 septembre",
    );
    expect(page?.bodyHtml).not.toContain("© Primature");
    expect(page?.imageUrl).toBe(
      "https://primature.sn/sites/default/files/2026-09/GOUV%20ALAMLO1_1.jpg",
    );
  });

  it("returns null when the page holds no article", () => {
    expect(parseArticlePage("<html><body><article><p>x</p></article></body></html>")).toBeNull();
  });
});

function respond(body: string, status = 200) {
  return Promise.resolve(new Response(body, { status }));
}

describe("createPrimatureProvider", () => {
  it("lists a page politely, identified, newest page first", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(() => respond(NEWEST));
    const provider = createPrimatureProvider({ fetchImpl: fetchImpl as never, intervalMs: 0 });
    const page = await provider.listPage("fr", 1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://primature.sn/publications/actualites?page=0",
    );
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({
      headers: { "User-Agent": USER_AGENT },
    });
    expect(page.lastPage).toBe(42);
    expect(page.refs[3]).toMatchObject({
      sourceId: COUNCIL_SLUG,
      sourceUpdatedAt: "2026-09-30",
      publishedOn: "2026-09-30",
    });
  });

  it("has no Wolof listing, without asking the site", async () => {
    const fetchImpl = vi.fn(() => respond(NEWEST));
    const provider = createPrimatureProvider({ fetchImpl: fetchImpl, intervalMs: 0 });
    expect(await provider.listPage("wo", 1)).toEqual({ refs: [], lastPage: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetches an article as the Primature's, identical to the source", async () => {
    const provider = createPrimatureProvider({
      fetchImpl: () => respond(COUNCIL),
      intervalMs: 0,
      now: () => new Date("2026-10-09T12:00:00Z"),
    });
    const article = await provider.fetchArticle({
      sourceId: COUNCIL_SLUG,
      slug: COUNCIL_SLUG,
      lang: "fr",
      sourceUpdatedAt: "2026-09-30",
      publishedOn: "2026-09-30",
      coverSourceUrl: null,
    });
    expect(article).toMatchObject({
      id: primatureArticleId(COUNCIL_SLUG),
      publisher: "primature",
      category: "actualites",
      sourceUrl: primatureArticleUrl(COUNCIL_SLUG),
      sourcePublishedOn: "2026-09-30",
      sourceUpdatedAt: null,
      fetchedAt: "2026-10-09T12:00:00.000Z",
      lang: "fr",
    });
    expect(article.translations[0]?.title).toBe("Conseil des ministres du 30 septembre 2026");
    expect(article.translations[0]?.bodyHtml).not.toContain("<meta");
  });

  it("quarantines a page whose article cannot be found", async () => {
    const provider = createPrimatureProvider({
      fetchImpl: () => respond("<html><body>Maintenance</body></html>"),
      intervalMs: 0,
    });
    await expect(
      provider.fetchArticle({
        sourceId: "x",
        slug: "x",
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
  });

  it("gives every article one stable id, its canonical address", () => {
    expect(primatureArticleId(COUNCIL_SLUG)).toBe(primatureArticleId(COUNCIL_SLUG));
    expect(primatureArticleId(COUNCIL_SLUG)).not.toBe(primatureArticleId("autre"));
  });
});
