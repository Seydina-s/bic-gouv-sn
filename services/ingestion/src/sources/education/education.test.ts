import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import {
  createEducationProvider,
  EDUCATION_SITE,
  normalizeEducationPost,
  postsOf,
} from "./education-provider";

const home = () => readFileSync(new URL("fixtures/education-home.html", import.meta.url), "utf8");

describe("postsOf", () => {
  it("reads the newest articles the home page is built with", () => {
    const posts = postsOf(home());
    expect(posts).toHaveLength(9);
    expect(posts[0]).toMatchObject({
      url: "thies-un-important-don-de-vivres-du-men-a-linstitut-national-deducation-et-de-formation-des-jeunes-aveugles",
      published_at: "2026-04-30 17:07:47",
    });
    expect(postsOf("<html></html>")).toEqual([]);
  });
});

describe("normalizeEducationPost", () => {
  it("keeps the official text, linked to its page on the site", () => {
    const [post] = postsOf(home());
    if (post === undefined) {
      throw new Error("no post in the fixture");
    }
    const article = normalizeEducationPost(post, "2026-10-11T23:00:00Z");
    expect(article).toMatchObject({
      publisher: "education",
      sourcePublishedOn: "2026-04-30",
      sourceUrl: `${EDUCATION_SITE}/posts/${post.url}`,
    });
    expect(() => normalizeEducationPost({ ...post, content: "" }, "2026-10-11T23:00:00Z")).toThrow(
      QuarantineError,
    );
  });
});

describe("createEducationProvider", () => {
  it("lists the articles with their photo, and reads each from the same page", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response(home())));
    const provider = createEducationProvider({ fetchImpl, intervalMs: 0 });
    const page = await provider.listPage("fr", 1);
    expect(page.refs).toHaveLength(9);
    expect(page.refs[0]?.coverSourceUrl).toMatch(/^https:\/\/cms\.education\.sn\/uploads\/.+%20/);
    const ref = page.refs[2];
    if (ref === undefined) {
      throw new Error("no ref");
    }
    expect((await provider.fetchArticle(ref)).publisher).toBe("education");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sets the site aside when its home page no longer carries articles", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response("<html></html>")));
    const provider = createEducationProvider({ fetchImpl, intervalMs: 0 });
    await expect(provider.listPage("fr", 1)).rejects.toBeInstanceOf(QuarantineError);
  });
});

describe("the education site's edge cases", () => {
  const page = (fallback: unknown) =>
    `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { fallback } } })}</script>`;

  it("keeps only well-formed articles, and none without the expected data", () => {
    const [post] = postsOf(home());
    expect(postsOf(page({ "/posts?x": [post, { id: "pas un nombre" }] }))).toHaveLength(1);
    expect(postsOf(page({ "/autre": [post] }))).toEqual([]);
    expect(postsOf(page({ "/posts?x": "pas une liste" }))).toEqual([]);
    expect(
      postsOf('<script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>'),
    ).toEqual([]);
  });

  it("sets aside an article without a title, lists nothing in Wolof, and one gone", async () => {
    const [post] = postsOf(home());
    if (post === undefined) {
      throw new Error("no post");
    }
    expect(() => normalizeEducationPost({ ...post, title: " " }, "2026-10-11T23:00:00Z")).toThrow(
      "no title",
    );
    const withoutCover = page({ "/posts?x": [{ ...post, cover: null }] });
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response(withoutCover)));
    const provider = createEducationProvider({ fetchImpl, intervalMs: 0 });
    expect(await provider.listPage("wo", 1)).toEqual({ refs: [], lastPage: 1 });
    expect((await provider.listPage("fr", 1)).refs[0]?.coverSourceUrl).toBeNull();
    await expect(
      provider.fetchArticle({
        sourceId: "disparu",
        slug: "disparu",
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
    expect(provider.circuits?.()).toHaveLength(1);
    const photo = vi.fn<typeof fetch>(() => Promise.resolve(new Response("jpg")));
    expect(
      (
        await createEducationProvider({ fetchImpl: photo, intervalMs: 0 }).downloadMedia(
          "https://cms.education.sn/uploads/a.jpg",
        )
      ).toString(),
    ).toBe("jpg");
  });
});
