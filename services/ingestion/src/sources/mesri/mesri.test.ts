import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QuarantineError } from "../../lib/errors";
import {
  createMesriProvider,
  mesriArticleId,
  parseMesriArticle,
  parseMesriListing,
} from "./mesri-provider";

// Pages saved from mesrisenegal.sn on 09/10/2026, embedded pictures shortened.
const page = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

describe("parseMesriListing", () => {
  it("reads the articles of a page with their card's photo, and the number of pages", () => {
    const listing = parseMesriListing(page("list.html"));
    expect(listing.lastPage).toBe(98);
    expect(listing.items.length).toBeGreaterThan(5);
    expect(listing.items[0]).toEqual({
      path: "/article/communique-du-mesri-2",
      cover: "https://mesrisenegal.sn/uploads/images/2026/10/communique-du-mesri-554b6c93-md.png",
    });
  });
});

describe("parseMesriArticle", () => {
  it("reads the title, the exact day and the section", () => {
    expect(parseMesriArticle(page("article.html"))).toMatchObject({
      title:
        "Arrêté fixant les conditions et modalités de signature des diplômes délivrés par les EPES",
      publishedOn: "2026-10-04",
      section: "dges",
    });
  });

  it("finds no article in another page", () => {
    expect(parseMesriArticle("<html><body><h1>Accueil</h1></body></html>")).toBeNull();
  });
});

describe("createMesriProvider", () => {
  const ref = {
    sourceId: "/article/x",
    slug: "/article/x",
    lang: "fr" as const,
    sourceUpdatedAt: "",
    coverSourceUrl: null,
  };

  it("publishes a communiqué that is the page's picture alone", async () => {
    const provider = createMesriProvider({
      fetchImpl: (() => Promise.resolve(new Response(page("article.html")))) as never,
      intervalMs: 0,
    });
    const article = await provider.fetchArticle(ref);
    expect(article.translations[0]?.bodyHtml).toBe(
      '<p><img src="https://mesrisenegal.sn/uploads/images/2026/10/arrete-n-22-09-f10f915c.png" alt="" /></p>',
    );
  });

  it("sets aside a page with neither text nor picture", async () => {
    const html = page("article.html").replace(/<meta\s[^>]*og:image[^>]*>/g, "");
    const provider = createMesriProvider({
      fetchImpl: (() => Promise.resolve(new Response(html))) as never,
      intervalMs: 0,
    });
    await expect(provider.fetchArticle(ref)).rejects.toBeInstanceOf(QuarantineError);
  });

  it("publishes a text article as the ministry's, dated by its page", async () => {
    const html = page("article.html").replace(
      /<div class="article-body" id="article-body">/,
      '<div class="article-body" id="article-body"><p>Le ministère informe les étudiants que le paiement des bourses débutera le lundi prochain dans toutes les agences.</p>',
    );
    const provider = createMesriProvider({
      fetchImpl: () => Promise.resolve(new Response(html)),
      intervalMs: 0,
    });
    expect(await provider.fetchArticle(ref)).toMatchObject({
      id: mesriArticleId("/article/x"),
      publisher: "enseignement-superieur",
      sourcePublishedOn: "2026-10-04",
      sourceUrl: "https://mesrisenegal.sn/article/x",
    });
  });
});
