import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { USER_AGENT } from "../../lib/polite-http";
import { builderMedia, splitBlankLines } from "./clean";
import { WORDPRESS_MINISTRIES } from "./ministries";
import {
  createWordpressProvider,
  normalizeWordpressPost,
  parseRestBody,
  restUrl,
  plainTitle,
  wordpressArticleId,
} from "./wordpress-provider";

// Real posts saved from each ministry's REST interface on 09/10/2026 (docs/sources.md).
type Site = keyof typeof WORDPRESS_MINISTRIES;
type SavedPost = Parameters<typeof normalizeWordpressPost>[1] & {
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[] };
};
const saved = (site: Site): SavedPost[] =>
  JSON.parse(
    readFileSync(new URL(`fixtures/${site}-list.json`, import.meta.url), "utf8"),
  ) as SavedPost[];

function bodyOf(site: Site, index = 0): string {
  const post = saved(site)[index];
  if (post === undefined) {
    throw new Error(`no saved post ${String(index)} for ${site}`);
  }
  const cover = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
  const article = normalizeWordpressPost(
    WORDPRESS_MINISTRIES[site],
    post,
    cover,
    "2026-10-09T12:00:00Z",
  );
  return article.translations[0]?.bodyHtml ?? "";
}

describe("ministry posts, cleaned site by site", () => {
  it("drops the Divi builder codes of the Justice site, keeps its words", () => {
    const body = bodyOf("justice");
    expect(body).not.toMatch(/et_pb_|\[\/?et_/);
    expect(body).toContain("Avocats sans frontières Canada");
  });

  it("drops the Industry and Trade site's search box, category list and related posts", () => {
    const body = bodyOf("industrie-commerce");
    expect(body).not.toContain("Non classé");
    expect(body).not.toContain("Aucun résultat");
    expect(body).toContain("Un principe : la liberté");
  });

  it("drops the Energy site's repeated title and photo, menu and follow link", () => {
    const body = bodyOf("energie");
    expect(body).not.toContain("Departments");
    expect(body).not.toContain("Suivez-Nous");
    expect(body).not.toContain("<h3>");
    expect(body).not.toContain("<img");
    expect(body.match(/<p>/g)?.length).toBeGreaterThan(3);
  });

  it("keeps the names linked to social network profiles, without the tracking link", () => {
    const body = bodyOf("hydraulique");
    expect(body).not.toContain("facebook.com");
    expect(body).toContain("Cheikh Tidiane DIEYE");
  });

  it("keeps the Agriculture site's photo gallery", () => {
    expect(bodyOf("agriculture").match(/<img /g)?.length).toBeGreaterThan(5);
  });
});

describe("text helpers", () => {
  it("makes paragraphs of lines separated by blank lines", () => {
    expect(splitBlankLines("<p><br />Un.<br /><br />Deux.<br />suite</p>")).toBe(
      "<p>Un.</p><p>Deux.<br />suite</p>",
    );
  });

  it("decodes a title's entities and tidies its spaces", () => {
    expect(plainTitle("Hivernage&nbsp;: l&#8217;eau  au   cœur")).toBe("Hivernage : l’eau au cœur");
  });
});

function respond(body: unknown, totalPages = "1") {
  return Promise.resolve(
    new Response(JSON.stringify(body), { headers: { "x-wp-totalpages": totalPages } }),
  );
}

describe("createWordpressProvider", () => {
  const site = WORDPRESS_MINISTRIES.justice;

  it("lists a page politely, identified, with the site's page count and cover photos", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(() =>
      respond(saved("justice"), "39"),
    );
    const provider = createWordpressProvider(site, {
      fetchImpl: fetchImpl as never,
      intervalMs: 0,
    });
    const page = await provider.listPage("fr", 2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(
      /^https:\/\/justice\.sec\.gouv\.sn\/wp-json\/wp\/v2\/posts\?per_page=20&page=2&/,
    );
    expect(init.headers).toMatchObject({ "User-Agent": USER_AGENT });
    expect(page.lastPage).toBe(39);
    expect(page.refs[0]).toMatchObject({ sourceId: 9129, publishedOn: "2026-10-09" });
    expect(page.refs[0]?.sourceUpdatedAt).toMatch(/Z$/);
    expect(page.refs[0]?.coverSourceUrl).toMatch(/^https:\/\/justice\.sec\.gouv\.sn\/wp-content\//);
  });

  it("has no Wolof listing, without asking the site", async () => {
    const fetchImpl = vi.fn(() => respond([]));
    const provider = createWordpressProvider(site, {
      fetchImpl: fetchImpl,
      intervalMs: 0,
    });
    expect(await provider.listPage("wo", 1)).toEqual({ refs: [], lastPage: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetches a post as the ministry's article, with exact dates and a stable id", async () => {
    const post = saved("justice")[0];
    const provider = createWordpressProvider(site, {
      fetchImpl: () => respond(post),
      intervalMs: 0,
      now: () => new Date("2026-10-09T12:00:00Z"),
    });
    const article = await provider.fetchArticle({
      sourceId: 9129,
      slug: "x",
      lang: "fr",
      sourceUpdatedAt: "",
      coverSourceUrl: null,
    });
    expect(article).toMatchObject({
      id: wordpressArticleId(site.origin, 9129),
      publisher: "justice",
      category: "actualites",
      sourcePublishedOn: "2026-10-09",
      fetchedAt: "2026-10-09T12:00:00.000Z",
    });
    expect(article.sourceUrl).toMatch(/^https:\/\/justice\.sec\.gouv\.sn\//);
  });

  it("quarantines a post whose shape changed", async () => {
    const provider = createWordpressProvider(site, {
      fetchImpl: () => respond({ id: 1 }),
      intervalMs: 0,
    });
    await expect(
      provider.fetchArticle({
        sourceId: 1,
        slug: "x",
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
  });
});

describe("page builder media", () => {
  it("turns a Divi video code into the official YouTube embed", () => {
    const code =
      "[et_pb_video src=\u00a0\u00bbhttps://youtu.be/FUKyifLxD5g\u00a0\u00bb _builder_version=\u00a0\u00bb4.16″]";
    expect(builderMedia(`<p>${code}</p>`)).toBe(
      '<p><iframe src="https://www.youtube.com/embed/FUKyifLxD5g"></iframe></p>',
    );
  });

  it("turns a Divi image code into the image", () => {
    const url = "https://justice.sec.gouv.sn/wp-content/uploads/a.jpg";
    expect(builderMedia(`[et_pb_image src=\u00a0\u00bb${url}\u00a0\u00bb]`)).toBe(
      `<img src="${url}" alt="" />`,
    );
  });

  it("keeps a poster that is the whole post, even when it is also the cover", () => {
    const poster = "https://agriculture.gouv.sn/wp-content/uploads/2026/01/DHORT.png";
    const [first] = saved("agriculture");
    if (first === undefined) {
      throw new Error("no saved post");
    }
    const post = {
      ...first,
      content: { rendered: `<figure><img src="${poster}" alt="" /></figure>` },
    };
    const article = normalizeWordpressPost(
      WORDPRESS_MINISTRIES.agriculture,
      post,
      poster,
      "2026-10-09T12:00:00Z",
    );
    expect(article.translations[0]?.bodyHtml).toContain(poster);
  });
});

describe("Fisheries site", () => {
  it("reads a REST answer printed after the page builder's style blocks", () => {
    expect(parseRestBody('<style id="x">.a{color:red}</style>\n[{"id":1}]')).toEqual([{ id: 1 }]);
    expect(parseRestBody("<html>Maintenance</html>")).toBeNull();
  });

  it("publishes a communiqué that is an official PDF alone", () => {
    const body = bodyOf("peches");
    expect(body).toContain("https://mpem.gouv.sn/wp-content/uploads/2026/10/");
    expect(body).toContain(".pdf");
  });

  it("keeps the Fisheries posts' words and photos", () => {
    const body = bodyOf("peches", 1);
    expect(body).toContain("Joal-Fadiouth");
    expect(body.match(/<img /g)?.length).toBeGreaterThan(2);
  });
});

describe("Employment and Training site", () => {
  it("reads the REST interface at its query address", () => {
    const site = WORDPRESS_MINISTRIES["emploi-formation"];
    expect(restUrl(site, "posts", "per_page=20")).toBe(
      "https://formation.gouv.sn/?rest_route=/wp/v2/posts&per_page=20",
    );
    expect(restUrl(WORDPRESS_MINISTRIES.justice, "posts/1", "_fields=id")).toBe(
      "https://justice.sec.gouv.sn/wp-json/wp/v2/posts/1?_fields=id",
    );
  });

  it("keeps the emoji pasted from Facebook as text, not as Facebook's picture", () => {
    const body = bodyOf("emploi-formation", 2);
    expect(body).not.toContain("fbcdn");
    expect(body).toContain("🍅");
  });
});
