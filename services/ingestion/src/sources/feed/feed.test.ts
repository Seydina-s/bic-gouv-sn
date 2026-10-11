import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { createFeedProvider, normalizeFeedItem, parseFeed, xmlText } from "./feed-provider";
import { FEED_MINISTRIES } from "./ministries";

const SITE = FEED_MINISTRIES["fonction-publique"];
const feed = () =>
  readFileSync(new URL("fixtures/fonctionpublique-rss.xml", import.meta.url), "utf8");

describe("parseFeed", () => {
  it("reads the site's articles whole, without the home page, in https", () => {
    const items = parseFeed(feed(), SITE.origin);
    expect(items).toHaveLength(10);
    expect(
      items.every((item) => item.link.startsWith("https://www.fonctionpublique.gouv.sn/?")),
    ).toBe(true);
    expect(items[2]).toMatchObject({
      title: "Départ à la Retraite : deux Figures Emblématiques de la Fonction publique célébrées.",
      day: "2026-04-01",
    });
  });

  it("brings decorative letters back to ordinary ones", () => {
    expect(parseFeed(feed(), SITE.origin)[0]?.title).toMatch(/^Passation de service/);
    expect(xmlText("&#119823;&#119834;&lt;b&gt;")).toBe("𝐏𝐚<b>");
    expect(xmlText("<![CDATA[<p>Texte</p>]]>")).toBe("<p>Texte</p>");
  });
});

describe("normalizeFeedItem", () => {
  it("keeps the official text, and sets aside an article without text", () => {
    const [item] = parseFeed(feed(), SITE.origin);
    if (item === undefined) {
      throw new Error("no item in the fixture");
    }
    const article = normalizeFeedItem(item, SITE, "2026-10-11T22:00:00Z");
    expect(article).toMatchObject({
      publisher: "fonction-publique",
      sourcePublishedOn: "2026-06-08",
      sourceUrl: item.link,
    });
    expect(() =>
      normalizeFeedItem({ ...item, html: "<p></p>" }, SITE, "2026-10-11T22:00:00Z"),
    ).toThrow(QuarantineError);
  });
});

describe("createFeedProvider", () => {
  it("lists the feed's articles and reads each from it, in one visit", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response(feed())));
    const provider = createFeedProvider({ ...SITE, intervalMs: 0 }, { fetchImpl });
    const page = await provider.listPage("fr", 1);
    expect(page.refs).toHaveLength(10);
    expect(await provider.listPage("wo", 1)).toEqual({ refs: [], lastPage: 1 });
    const ref = page.refs[3];
    if (ref === undefined) {
      throw new Error("no ref");
    }
    const article = await provider.fetchArticle(ref);
    expect(article.sourceUrl).toBe(ref.sourceId);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("the feed's edge cases", () => {
  const item = (inner: string) => `<rss><channel><item>${inner}</item></channel></rss>`;
  const ORIGIN = "https://www.fonctionpublique.gouv.sn";

  it("skips links elsewhere, without a day or not an address, and reads other dates and texts", () => {
    const xml = [
      item(
        "<title>Ailleurs</title><link>https://exemple.org/?a</link><pubDate>Mon, 01 Jun 2026 10:00:00 +0000</pubDate>",
      ),
      item("<title>Sans date</title><link>https://www.fonctionpublique.gouv.sn/?b</link>"),
      item(
        "<title>Mauvaise adresse</title><link>http://[</link><pubDate>Mon, 01 Jun 2026 10:00:00 +0000</pubDate>",
      ),
      item(
        "<title><![CDATA[Titre &#x26; suite]]></title><link>/?c</link><pubDate>Mon, 01 Jun 2026 10:00:00 +0000</pubDate><description>&lt;p&gt;Résumé&lt;/p&gt;</description>",
      ),
    ].join("");
    const items = parseFeed(xml, ORIGIN);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Titre &#x26; suite",
      link: "https://www.fonctionpublique.gouv.sn/?c",
      day: "2026-06-01",
      html: "<p>Résumé</p>",
    });
  });

  it("sets aside an article without a title, and one no longer in the feed", async () => {
    const [first] = parseFeed(feed(), SITE.origin);
    if (first === undefined) {
      throw new Error("no item");
    }
    expect(() => normalizeFeedItem({ ...first, title: "" }, SITE, "2026-10-11T22:00:00Z")).toThrow(
      "no title",
    );
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response(feed())));
    const provider = createFeedProvider({ ...SITE, intervalMs: 0 }, { fetchImpl });
    expect(await provider.listPage("fr", 2)).toEqual({ refs: [], lastPage: 1 });
    await expect(
      provider.fetchArticle({
        sourceId: "https://www.fonctionpublique.gouv.sn/?disparu",
        slug: "disparu",
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
    expect(provider.circuits?.()).toHaveLength(1);
  });

  it("downloads a photo of the site", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response("jpg")));
    const provider = createFeedProvider({ ...SITE, intervalMs: 0 }, { fetchImpl });
    expect(
      (await provider.downloadMedia("https://www.fonctionpublique.gouv.sn/IMG/a.jpg")).toString(),
    ).toBe("jpg");
  });
});
