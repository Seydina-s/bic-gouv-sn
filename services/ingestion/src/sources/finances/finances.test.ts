import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import {
  createFinancesProvider,
  FINANCES_SITE,
  financesArticleId,
  normalizeFinancesPost,
  postsOfPage,
} from "./finances-provider";

/** Three published articles as apimfb.finances.gouv.sn gives them (12/10/2026). */
const published = (): unknown =>
  JSON.parse(readFileSync(new URL("fixtures/published.json", import.meta.url), "utf8"));

function answering(body: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body))));
}

const SLUG =
  "acces-universel-a-lelectricite-mobiliser-les-partenaires-pour-passer-des-engagements-aux-resultats";

describe("postsOfPage", () => {
  it("reads the published articles and how many pages the list has", () => {
    const { posts, lastPage } = postsOfPage(published());
    expect(posts).toHaveLength(3);
    expect(posts[0]?.slug).toBe(SLUG);
    expect(lastPage).toBe(20);
  });
});

describe("normalizeFinancesPost", () => {
  it("keeps the official text, its day and section, linked to its page on the site", () => {
    const [news, communique] = postsOfPage(published()).posts;
    if (news === undefined || communique === undefined) {
      throw new Error("fixture");
    }
    const article = normalizeFinancesPost(news, "2026-10-12T18:00:00Z");
    expect(article).toMatchObject({
      publisher: "finances",
      category: "actualites",
      sourcePublishedOn: "2026-10-06",
      sourceUrl: `${FINANCES_SITE}/actualites/${SLUG}`,
      id: financesArticleId(SLUG),
    });
    expect(article.translations[0]?.bodyHtml).toContain("Cheikh DIBA");
    // Filed as a communiqué by the ministry.
    expect(
      normalizeFinancesPost({ ...news, type: "COMMUNIQUE" }, "2026-10-12T18:00:00Z").category,
    ).toBe("communiques");
    // A press release written in English only, even in its French version, waits.
    expect(() => normalizeFinancesPost(communique, "2026-10-12T18:00:00Z")).toThrow(/English/);
    expect(() =>
      normalizeFinancesPost(
        { ...news, i18n: { fr: { title: news.i18n.fr.title, content: "" } } },
        "2026-10-12T18:00:00Z",
      ),
    ).toThrow(QuarantineError);
  });
});

describe("createFinancesProvider", () => {
  it("lists the articles with their cover, then gives each one from the list", async () => {
    const fetchImpl = answering(published());
    const provider = createFinancesProvider({ fetchImpl, intervalMs: 0 });
    const page = await provider.listPage("fr", 1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://apimfb.finances.gouv.sn/article/published?page=1&limit=20",
    );
    expect(page.lastPage).toBe(20);
    const [ref] = page.refs;
    if (ref === undefined) {
      throw new Error("fixture");
    }
    expect(ref.coverSourceUrl).toMatch(/^https:\/\/apimfb\.finances\.gouv\.sn\/files\//);
    expect(provider.articleIdFor(ref)).toBe(financesArticleId(SLUG));
    expect((await provider.fetchArticle(ref)).sourcePublishedOn).toBe("2026-10-06");
    await expect(provider.fetchArticle({ ...ref, sourceId: "inconnu" })).rejects.toThrow(
      QuarantineError,
    );
    expect(await provider.listPage("wo", 1)).toEqual({ refs: [], lastPage: 1 });
  });

  it("says the service changed when its first page lists nothing", async () => {
    const empty = answering({ data: { list: [], pagination: { totalPages: 0 } } });
    const provider = createFinancesProvider({ fetchImpl: empty, intervalMs: 0 });
    await expect(provider.listPage("fr", 1)).rejects.toThrow(QuarantineError);
  });
});
