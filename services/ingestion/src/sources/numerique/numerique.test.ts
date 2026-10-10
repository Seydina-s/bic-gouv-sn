import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { USER_AGENT } from "../../lib/polite-http";
import {
  createNumeriqueProvider,
  normalizeNumerique,
  numeriqueArticleId,
} from "./numerique-provider";

// Answers saved from api.mctn.sn on 10/10/2026 (docs/sources.md).
const saved = (name: string) =>
  JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8")) as unknown;
const LIST = saved("list.json") as { data: Parameters<typeof normalizeNumerique>[0][] };
const ONE = saved("publication.json");
const respond = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

describe("normalizeNumerique", () => {
  const [first] = LIST.data;
  if (first === undefined) {
    throw new Error("no saved publication");
  }

  it("writes the decorative title in ordinary letters, keeps the text and photo gallery", () => {
    const article = normalizeNumerique(first, "2026-10-10T02:00:00Z");
    expect(article.translations[0]?.title).toMatch(/^Coopération numérique : le Sénégal/);
    expect(article.translations[0]?.bodyHtml).toContain("Backbones Nationaux");
    expect(article.translations[0]?.bodyHtml.match(/<img /g)?.length).toBeGreaterThan(3);
    expect(article).toMatchObject({
      publisher: "numerique",
      sourcePublishedOn: "2026-10-09",
      sourceUrl: `https://www.mctn.sn/post/${first.slug}`,
    });
  });

  it("drops the tracking links to social network profiles, keeping their words", () => {
    const body = normalizeNumerique(first, "2026-10-10T02:00:00Z").translations[0]?.bodyHtml;
    expect(body).not.toContain("facebook.com");
  });

  it("sets aside a publication that is not published, or in another language", () => {
    expect(() => normalizeNumerique({ ...first, status: "draft" }, "")).toThrow(QuarantineError);
    expect(() => normalizeNumerique({ ...first, langue: "en" }, "")).toThrow(QuarantineError);
  });
});

describe("createNumeriqueProvider", () => {
  it("lists a page of the public interface, politely and identified", async () => {
    const fetchImpl = vi.fn<(url: string) => Promise<Response>>(() => respond(LIST));
    const provider = createNumeriqueProvider({ fetchImpl: fetchImpl as never, intervalMs: 0 });
    const page = await provider.listPage("fr", 2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://api.mctn.sn/api/publications/category/actualites?page=2",
    );
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({
      headers: { "User-Agent": USER_AGENT },
    });
    expect(page.lastPage).toBe(30);
    expect(page.refs).toHaveLength(10);
    expect(page.refs[0]?.coverSourceUrl).toMatch(/^https:\/\/api\.mctn\.sn\/fichier\/afficher\?/);
  });

  it("lists a malformed publication without losing the page, then sets it aside", async () => {
    const broken = { ...LIST, data: [...LIST.data.slice(1), { ...LIST.data[0], slug: "" }] };
    const provider = createNumeriqueProvider({
      fetchImpl: () => respond(broken),
      intervalMs: 0,
    });
    const page = await provider.listPage("fr", 1);
    expect(page.refs).toHaveLength(10);
    const last = page.refs.at(-1);
    if (last === undefined) {
      throw new Error("no ref");
    }
    expect(last.slug).toBe("");
    await expect(provider.fetchArticle(last)).rejects.toBeInstanceOf(QuarantineError);
  });

  it("reads one publication by its name, with a stable id", async () => {
    const provider = createNumeriqueProvider({
      fetchImpl: () => respond(ONE),
      intervalMs: 0,
    });
    const article = await provider.fetchArticle({
      sourceId: 672,
      slug: "publication-1791569012",
      lang: "fr",
      sourceUpdatedAt: "",
      coverSourceUrl: null,
    });
    expect(article.id).toBe(numeriqueArticleId(672));
  });
});
