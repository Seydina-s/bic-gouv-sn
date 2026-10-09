import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { nuxtData } from "../../lib/nuxt-data";
import { USER_AGENT } from "../../lib/polite-http";
import { createInterieurProvider, interieurArticleId } from "./interieur-provider";
import { blocksToHtml } from "./strapi-blocks";

// Pages saved from interieur.gouv.sn on 09/10/2026 (docs/sources.md).
const page = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
const respond = (body: string) => Promise.resolve(new Response(body));

function provider(
  html: string,
  fetchImpl = vi.fn<(url: string) => Promise<Response>>(() => respond(html)),
) {
  return {
    fetchImpl,
    source: createInterieurProvider({
      fetchImpl: fetchImpl as never,
      intervalMs: 0,
      now: () => new Date("2026-10-09T22:00:00Z"),
    }),
  };
}

const ref = (slug: string) => ({
  sourceId: "x",
  slug,
  lang: "fr" as const,
  sourceUpdatedAt: "",
  coverSourceUrl: null,
});

describe("nuxtData", () => {
  it("reads the data a Nuxt page carries", () => {
    expect(Object.keys(nuxtData(page("list.html")) ?? {})).toContain("actualites-all");
  });

  it("finds nothing in a page without Nuxt data", () => {
    expect(nuxtData("<html><body>Maintenance</body></html>")).toBeNull();
  });
});

describe("blocksToHtml", () => {
  it("writes paragraphs, headings, lists, links and marks, escaping the text", () => {
    const html = blocksToHtml(
      [
        { type: "heading", level: 1, children: [{ type: "text", text: "Titre" }] },
        {
          type: "paragraph",
          children: [
            { type: "text", text: "A & B ", bold: true },
            {
              type: "link",
              url: "https://www.interieur.gouv.sn/x",
              children: [{ type: "text", text: "lien" }],
            },
          ],
        },
        {
          type: "list",
          format: "ordered",
          children: [{ type: "list-item", children: [{ type: "text", text: "un" }] }],
        },
        { type: "inconnu", children: [] },
      ],
      (path) => path,
    );
    expect(html).toBe(
      '<h2>Titre</h2><p><strong>A &amp; B </strong><a href="https://www.interieur.gouv.sn/x">lien</a></p><ol><li>un</li></ol>',
    );
  });
});

describe("createInterieurProvider", () => {
  it("lists every article from the news page, with its section, day and cover", async () => {
    const { fetchImpl, source } = provider(page("list.html"));
    const listing = await source.listPage("fr", 1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://www.interieur.gouv.sn/actualites");
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({
      headers: { "User-Agent": USER_AGENT },
    });
    expect(listing.lastPage).toBe(1);
    expect(listing.refs).toHaveLength(58);
    expect(listing.refs[0]).toMatchObject({
      publishedOn: "2026-10-08",
      slug: expect.stringMatching(/^[a-z]+\/[a-z0-9-]+$/) as unknown,
    });
    expect(listing.refs[0]?.coverSourceUrl).toMatch(/^https:\/\/www\.interieur\.gouv\.sn\/media\//);
    expect(await source.listPage("fr", 2)).toEqual({ refs: [], lastPage: 1 });
  });

  it("reads an activity with its text and photo gallery", async () => {
    const article = await provider(page("article-activites.html")).source.fetchArticle(
      ref("activites/x"),
    );
    expect(article).toMatchObject({ publisher: "interieur", category: "actualites", lang: "fr" });
    expect(article.sourceUrl).toMatch(
      /^https:\/\/www\.interieur\.gouv\.sn\/actualites\/activites\//,
    );
    expect(article.translations[0]?.bodyHtml.match(/<img /g)).toHaveLength(6);
  });

  it("keeps a communiqué's signed document, in its section", async () => {
    const article = await provider(page("article-communiques.html")).source.fetchArticle(
      ref("communiques/x"),
    );
    expect(article.category).toBe("communiques");
    expect(article.translations[0]?.bodyHtml).toMatch(
      /href="https:\/\/www\.interieur\.gouv\.sn\/media\/[^"]+\.pdf"/,
    );
  });

  it("files a speech under the speeches, without the stored video the app cannot play", async () => {
    const article = await provider(page("article-discours.html")).source.fetchArticle(
      ref("discours/x"),
    );
    expect(article.category).toBe("discours");
    expect(article.translations[0]?.bodyHtml).not.toContain(".mp4");
  });

  it("quarantines a page without article data", async () => {
    await expect(
      provider("<html>Maintenance</html>").source.fetchArticle(ref("activites/x")),
    ).rejects.toBeInstanceOf(QuarantineError);
  });

  it("gives an article one id, its CMS document id", () => {
    expect(interieurArticleId("abc")).toBe(interieurArticleId("abc"));
    expect(interieurArticleId("abc")).not.toBe(interieurArticleId("abd"));
  });
});
