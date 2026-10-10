import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { createdDay, feedDays, parseDrupalArticle, parseDrupalListing } from "./drupal-parse";
import { createDrupalProvider, drupalArticleId, originalImage } from "./drupal-provider";
import { DRUPAL_MINISTRIES } from "./ministries";

// Pages saved from sante.gouv.sn and forcesarmees.gouv.sn on 09/10/2026.
const page = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const ARMEES = "https://www.forcesarmees.gouv.sn";
const SANTE = "https://www.sante.gouv.sn";

describe("parseDrupalListing", () => {
  it("reads each article of the Armed Forces listing with its day and photo", () => {
    const listing = parseDrupalListing(page("armees-list.html"), ARMEES, (path) =>
      path.startsWith("/actualites/"),
    );
    expect(listing.lastPageIndex).toBe(32);
    expect(listing.items[0]).toMatchObject({
      path: "/actualites/le-senegal-entame-officiellement-sa-mission-de-mediation-dans-la-crise-en-guinee-bissau",
      publishedOn: "2026-08-08",
    });
    expect(listing.items.every((item) => item.publishedOn !== null)).toBe(true);
  });

  it("reads the Health listing, which shows no day", () => {
    const listing = parseDrupalListing(page("sante-list.html"), SANTE, (path) =>
      path.startsWith("/Actualites/"),
    );
    expect(listing.lastPageIndex).toBe(134);
    expect(listing.items.length).toBeGreaterThan(5);
    expect(listing.items[0]?.publishedOn).toBeNull();
  });
});

describe("parseDrupalArticle and feedDays", () => {
  it("reads the title from the page head and the text from the body field", () => {
    const article = parseDrupalArticle(page("sante-article.html"));
    expect(article?.title).toBe("DES SOINS PLUS SÛRS POUR MIEUX PROTÉGER CHAQUE PATIENT");
    expect(article?.bodyHtml).toContain("Guide national pour la sécurité des patients");
    expect(parseDrupalArticle("<html><head><title>x</title></head></html>")).toBeNull();
  });

  it("dates the newest articles by the feed", () => {
    expect(
      feedDays(page("sante-rss.xml")).get(
        "/Actualites/des-soins-plus-s%C3%BBrs-pour-mieux-prot%C3%A9ger-chaque-patient",
      ),
    ).toBe("2026-09-22");
  });

  it("reads a photo's original file, not its resized copy", () => {
    expect(
      originalImage(
        "/sites/default/files/styles/slider_555_395/public/actualites/a.jpg?itok=x",
        ARMEES,
      ),
    ).toBe("https://www.forcesarmees.gouv.sn/sites/default/files/actualites/a.jpg");
  });
});

describe("createDrupalProvider", () => {
  function routed(pages: Record<string, string>) {
    return vi.fn<(url: string) => Promise<Response>>((url) => {
      const key = Object.keys(pages).find((start) => url.startsWith(start));
      return Promise.resolve(new Response(key === undefined ? "" : pages[key]));
    });
  }

  it("goes through the Armed Forces sections one after the other", async () => {
    const fetchImpl = routed({
      [`${ARMEES}/actualites`]: page("armees-list.html"),
      [`${ARMEES}/communiques`]: "<html><body></body></html>",
      [`${ARMEES}/discours`]: "<html><body></body></html>",
    });
    const provider = createDrupalProvider(DRUPAL_MINISTRIES["forces-armees"], {
      fetchImpl: fetchImpl as never,
      intervalMs: 0,
    });
    const first = await provider.listPage("fr", 1);
    expect(first.lastPage).toBe(35);
    expect(first.refs[0]).toMatchObject({ publishedOn: "2026-08-08" });
    expect(first.refs[0]?.coverSourceUrl).toMatch(/\/sites\/default\/files\/actualites\/[^?]+$/);
    await provider.listPage("fr", 34);
    expect(fetchImpl.mock.calls.at(-1)?.[0]).toBe(`${ARMEES}/communiques?page=0`);
  });

  it("dates the Health site's newest articles by its feed", async () => {
    const provider = createDrupalProvider(DRUPAL_MINISTRIES.sante, {
      fetchImpl: routed({
        [`${SANTE}/rss.xml`]: page("sante-rss.xml"),
        [`${SANTE}/Actualites`]: page("sante-list.html"),
      }) as never,
      intervalMs: 0,
    });
    const listing = await provider.listPage("fr", 1);
    expect(listing.refs[0]).toMatchObject({ publishedOn: "2026-09-22" });
  });

  it("fetches an article in its section, as the ministry's", async () => {
    const provider = createDrupalProvider(DRUPAL_MINISTRIES["forces-armees"], {
      fetchImpl: routed({ [ARMEES]: page("armees-article.html") }) as never,
      intervalMs: 0,
      now: () => new Date("2026-10-09T23:00:00Z"),
    });
    const path = "/communiques/x";
    const article = await provider.fetchArticle({
      sourceId: path,
      slug: path,
      lang: "fr",
      sourceUpdatedAt: "2026-08-08",
      publishedOn: "2026-08-08",
      coverSourceUrl: null,
    });
    expect(article).toMatchObject({
      id: drupalArticleId(ARMEES, path),
      publisher: "forces-armees",
      category: "communiques",
      sourcePublishedOn: "2026-08-08",
      sourceUrl: `${ARMEES}${path}`,
    });
  });

  it("quarantines a page with no article", async () => {
    const provider = createDrupalProvider(DRUPAL_MINISTRIES.sante, {
      fetchImpl: routed({ [SANTE]: "<html><body>Maintenance</body></html>" }) as never,
      intervalMs: 0,
    });
    await expect(
      provider.fetchArticle({
        sourceId: "/Actualites/x",
        slug: "/Actualites/x",
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
  });
});

describe("Drupal article text", () => {
  it("lays the paragraphs flat, never one inside another", async () => {
    const provider = createDrupalProvider(DRUPAL_MINISTRIES.sante, {
      fetchImpl: () => Promise.resolve(new Response(page("sante-article.html"))),
      intervalMs: 0,
    });
    const article = await provider.fetchArticle({
      sourceId: "/Actualites/x",
      slug: "/Actualites/x",
      lang: "fr",
      sourceUpdatedAt: "",
      coverSourceUrl: null,
    });
    expect(article.translations[0]?.bodyHtml).not.toMatch(/<p>\s*<p>/);
    expect(article.sourcePublishedOn).toBeNull();
  });
});

describe("Foreign Affairs site (Drupal 9)", () => {
  const SITE = "https://www.diplomatie.gouv.sn";

  it("lists the communiqués at their node addresses, and both pages", () => {
    const listing = parseDrupalListing(page("diplomatie-list.html"), SITE, (path) =>
      path.startsWith("/node/"),
    );
    expect(listing.lastPageIndex).toBe(1);
    expect(listing.items[0]?.path).toBe("/node/306");
  });

  it("reads a communiqué with the day shown on its page", () => {
    expect(parseDrupalArticle(page("diplomatie-article.html"))).toMatchObject({
      title: "Situation politique en République de Guinée-Bissau.",
      publishedOn: "2026-10-08",
    });
    expect(createdDay("jeu 08/10/2026 - 17:35")).toBe("2026-10-08");
    expect(createdDay("31/02/2026")).toBeNull();
  });
});
