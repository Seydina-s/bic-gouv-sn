import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { collectLatest } from "../../collect";
import { QuarantineError, SourceUnreachableError } from "../../lib/errors";
import { detailResponseSchema, type DetailResponse } from "./api-schemas";
import { canonicalArticleUrl, normalizeDetail } from "./normalize";
import { PRESIDENCE_API, USER_AGENT, createPresidenceProvider } from "./presidence-provider";

// Real responses of the presidence.sn API recorded on 25/09/2026 (trimmed).
function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}
const detailFr = () => detailResponseSchema.parse(fixture("detail-fr"));
const FETCHED_AT = "2026-09-25T08:00:00.000Z";

function withBase(
  detail: DetailResponse,
  patch: Partial<DetailResponse["data"]["article"]["article"]>,
) {
  const copy = structuredClone(detail);
  Object.assign(copy.data.article.article, patch);
  return copy;
}

describe("normalizeDetail", () => {
  it("turns a real French article into a valid, traceable NewsArticle", () => {
    const article = normalizeDetail(detailFr(), { lang: "fr", fetchedAt: FETCHED_AT });
    expect(article).toMatchObject({
      kind: "news-article",
      category: "discours",
      lang: "fr",
      sourcePublishedOn: "2026-09-24",
      sourceUrl:
        "https://www.presidence.sn/fr/actualites/a-la-tribune-de-lonu-le-president-bassirou-diomaye-faye-porte-la-voix-du-senegal-pour-un-multilateralisme-renouvele/",
      fetchedAt: FETCHED_AT,
      version: 1,
    });
    const translation = article.translations[0];
    expect(translation?.status).toBe("official");
    expect(translation?.title).toMatch(/^À la tribune de l’ONU/);
    expect(translation?.bodyHtml).not.toMatch(/style=|class=|<div/);
    expect(translation?.bodyHtml).toContain("<p>À la tribune de l'Assemblée générale");
  });

  it("normalizes the official Wolof version with the same stable id as its base article", () => {
    const wolof = detailResponseSchema.parse(fixture("detail-wo"));
    const article = normalizeDetail(wolof, { lang: "wo", fetchedAt: FETCHED_AT });
    expect(article.lang).toBe("wo");
    expect(article.translations[0]?.title).toMatch(/^Njiitu Réew mi/);
    const again = normalizeDetail(wolof, { lang: "wo", fetchedAt: "2026-09-26T00:00:00.000Z" });
    expect(again.id).toBe(article.id);
    expect(again.contentHash).toBe(article.contentHash);
  });

  it.each([
    ["an unpublished article", { published: 0 as const }, /not published/],
    ["a deleted article", { deleted_at: "2026-09-24T00:00:00Z" }, /not published/],
    ["an unknown category", { categorieId: 99 }, /unknown category/],
  ])("quarantines %s", (_label, patch, reason) => {
    expect(() =>
      normalizeDetail(withBase(detailFr(), patch), { lang: "fr", fetchedAt: FETCHED_AT }),
    ).toThrow(reason);
  });

  it("quarantines an article that fails the content model", () => {
    const detail = detailFr();
    detail.data.article.titre = "   ";
    expect(() => normalizeDetail(detail, { lang: "fr", fetchedAt: FETCHED_AT })).toThrow(
      /Quarantined/,
    );
  });

  it("quarantines an article emptied by sanitization", () => {
    const detail = detailFr();
    detail.data.article.content = "<div><script>x()</script></div>";
    expect(() => normalizeDetail(detail, { lang: "fr", fetchedAt: FETCHED_AT })).toThrow(
      QuarantineError,
    );
  });

  it("builds the canonical URL with its final slash", () => {
    expect(canonicalArticleUrl("wo", "a b")).toBe("https://www.presidence.sn/wo/actualites/a%20b/");
  });
});

function urlOf(input: string | URL | Request): string {
  if (typeof input === "string") {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("createPresidenceProvider", () => {
  it("lists the latest articles with the language header and project User-Agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse(fixture("list-fr")));
    const provider = createPresidenceProvider({ fetchImpl, intervalMs: 0 });
    const { refs, lastPage } = await provider.listPage("fr", 1);
    expect(lastPage).toBe(127);
    expect(refs).toHaveLength(3);
    expect(refs[0]).toMatchObject({ sourceId: 1514, lang: "fr" });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`${PRESIDENCE_API}/articles?page=1&q=&categoryIds=`);
    expect(init?.headers).toMatchObject({ "Accept-Language": "fr", "User-Agent": USER_AGENT });
  });

  it("fetches and normalizes one article", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse(fixture("detail-fr")));
    const provider = createPresidenceProvider({
      fetchImpl,
      intervalMs: 0,
      now: () => new Date(FETCHED_AT),
    });
    const article = await provider.fetchArticle({
      sourceId: 1514,
      slug: "x y",
      lang: "fr",
      sourceUpdatedAt: "",
    });
    expect(article.fetchedAt).toBe(FETCHED_AT);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${PRESIDENCE_API}/article/x%20y`);
  });

  it("quarantines a response whose structure changed", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse({ data: { unexpected: true } }));
    const provider = createPresidenceProvider({ fetchImpl, intervalMs: 0 });
    await expect(provider.listPage("fr", 1)).rejects.toBeInstanceOf(QuarantineError);
  });

  it("does not retry a 404", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse({}, 404));
    const provider = createPresidenceProvider({ fetchImpl, intervalMs: 0 });
    await expect(provider.listPage("fr", 1)).rejects.toBeInstanceOf(SourceUnreachableError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reports a network failure as an unreachable source, after retries", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("fetch failed")));
    const provider = createPresidenceProvider({ fetchImpl, intervalMs: 0 });
    const pending = expect(provider.listPage("fr", 1)).rejects.toMatchObject({
      code: "INGESTION_SOURCE_UNREACHABLE",
      status: null,
    });
    await vi.runAllTimersAsync();
    await pending;
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("retries a server error before giving up", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse({}, 503));
    const provider = createPresidenceProvider({ fetchImpl, intervalMs: 0 });
    const pending = expect(provider.listPage("fr", 1)).rejects.toThrow(/HTTP 503/);
    await vi.runAllTimersAsync();
    await pending;
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe("collectLatest", () => {
  it("keeps going when one article fails, and reports it with its code", async () => {
    const fetchImpl = vi.fn<typeof fetch>((input) =>
      urlOf(input).includes("/articles?")
        ? jsonResponse(fixture("list-fr"))
        : urlOf(input).endsWith(
              encodeURIComponent(
                "a-la-tribune-de-lonu-le-president-bassirou-diomaye-faye-porte-la-voix-du-senegal-pour-un-multilateralisme-renouvele",
              ),
            )
          ? jsonResponse(fixture("detail-fr"))
          : jsonResponse({ data: {} }),
    );
    const report = await collectLatest(
      createPresidenceProvider({ fetchImpl, intervalMs: 0 }),
      "fr",
      3,
    );
    expect(report.articles).toHaveLength(1);
    expect(report.failures).toHaveLength(2);
    expect(report.failures[0]?.code).toBe("INGESTION_QUARANTINED");
  });

  it("reports non-coded errors as UNKNOWN", async () => {
    const provider = {
      articleIdFor: () => "id",
      listPage: () =>
        Promise.resolve({
          lastPage: 1,
          refs: [{ sourceId: 1, slug: "s", lang: "fr" as const, sourceUpdatedAt: "" }],
        }),
      fetchArticle: () => Promise.reject(new Error("boom")),
    };
    const report = await collectLatest(provider, "fr", 5);
    expect(report.failures).toEqual([{ ref: "s", code: "UNKNOWN", message: "boom" }]);
  });

  it("reports a non-Error rejection as text", async () => {
    const provider = {
      articleIdFor: () => "id",
      listPage: () =>
        Promise.resolve({
          lastPage: 1,
          refs: [{ sourceId: 1, slug: "s", lang: "fr" as const, sourceUpdatedAt: "" }],
        }),
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulates a misbehaving adapter
      fetchArticle: () => Promise.reject("plain text"),
    };
    const report = await collectLatest(provider, "fr", 5);
    expect(report.failures[0]?.message).toBe("plain text");
  });
});
