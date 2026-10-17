import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { Institution, NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider, WithdrawalCheck } from "./sources/source-provider";
import {
  isWithdrawalCheckDue,
  listingPagesFor,
  MAX_HIDDEN_AT_ONCE,
  nextWithdrawalCheck,
  reconcileWithdrawals,
} from "./withdrawn";

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
const urlOf = (slug: string) => `https://www.presidence.sn/fr/actualites/${slug}/`;

function article(n: number, slug: string, day = "2026-01-01"): NewsArticle {
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: `Titre ${slug}`,
      bodyHtml: "<p>Corps</p>",
      sourceUrl: urlOf(slug),
    },
  ];
  return {
    id: idOf(n),
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl: urlOf(slug),
    sourcePublishedOn: day,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, day, "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** The source still lists article 1 only; article 2 is gone, article 3 is unlisted but readable. */
function source(): SourceProvider & { read: string[] } {
  const read: string[] = [];
  const listed: SourceArticleRef = {
    sourceId: 1,
    slug: "encore-la",
    lang: "fr",
    sourceUpdatedAt: "",
    coverSourceUrl: null,
  };
  return {
    read,
    listPage: () => Promise.resolve({ refs: [listed], lastPage: 1 }),
    articleIdFor: (ref) => idOf(Number(ref.sourceId)),
    downloadMedia: () => Promise.reject(new Error("unused")),
    fetchArticle: () => Promise.reject(new Error("unused")),
    recheck: (sourceUrl) => {
      const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1) ?? "";
      read.push(slug);
      return Promise.resolve(CHECKS[slug] ?? "still-published");
    },
  };
}

/** The same site, answering every address as found: it cannot be checked. */
function blindSource(): SourceProvider {
  const provider: SourceProvider = source();
  delete provider.recheck;
  return provider;
}

/** What reading each placeholder article again says (lib/recheck.test.ts covers how). */
const CHECKS: Record<string, WithdrawalCheck> = {
  retire: "withdrawn",
  depublie: "withdrawn",
  panne: "unconfirmed",
};

let dir: string;
let repo: FileArticleRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-withdrawn-"));
  repo = new FileArticleRepository(join(dir, "news.json"));
  const stored = [
    article(1, "encore-la"),
    article(2, "retire"),
    article(3, "hors-liste"),
    article(4, "depublie"),
    article(5, "panne"),
  ];
  for (const item of stored) {
    await repo.save(item);
  }
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const NOW = new Date("2026-09-28T02:00:00Z");
const APPLY = { apply: true, now: () => NOW, institution: "presidence" as const };

/** Which stored versions are hidden, by slug. */
async function hidden(): Promise<string[]> {
  const page = await repo.list({ limit: 10, includeWithdrawn: true });
  return page.items
    .filter((item) => item.translations.some((t) => t.withdrawnAt !== undefined))
    .map((item) => item.sourceUrl)
    .sort();
}

describe("isWithdrawalCheckDue", () => {
  it("runs once a night, in the quiet hours", () => {
    const at = (iso: string) => new Date(iso);
    expect(isWithdrawalCheckDue(at("2026-09-28T02:30:00Z"), null)).toBe(true);
    expect(isWithdrawalCheckDue(at("2026-09-28T11:00:00Z"), null)).toBe(false);
    expect(isWithdrawalCheckDue(at("2026-09-28T03:00:00Z"), at("2026-09-28T02:30:00Z"))).toBe(
      false,
    );
    expect(isWithdrawalCheckDue(at("2026-09-29T02:10:00Z"), at("2026-09-28T02:30:00Z"))).toBe(true);
  });
});

describe("reconcileWithdrawals", () => {
  it("reads again only what the listing lost, and tells gone from a passing failure", async () => {
    const provider = source();
    const report = await reconcileWithdrawals(provider, repo, ["fr"], APPLY);
    const checks = Object.fromEntries(
      report.missing.map(({ sourceUrl, check }) => [sourceUrl, check]),
    );
    expect(checks).toEqual({
      [urlOf("retire")]: "withdrawn",
      [urlOf("hors-liste")]: "still-published",
      [urlOf("depublie")]: "withdrawn",
      [urlOf("panne")]: "unconfirmed",
    });
    expect(provider.read).not.toContain("encore-la");
  });

  it("hides only what the source withdrew, with the date, words kept", async () => {
    const report = await reconcileWithdrawals(source(), repo, ["fr"], APPLY);
    expect(report).toMatchObject({ hidden: 2, restored: 0 });
    expect(await hidden()).toEqual([urlOf("depublie"), urlOf("retire")]);
    const stored = await repo.get(idOf(2));
    expect(stored?.translations[0]).toMatchObject({
      title: "Titre retire",
      withdrawnAt: NOW.toISOString(),
    });
    expect(stored?.version).toBe(1);
    // A second run changes nothing: the mark and its date stay.
    expect(await reconcileWithdrawals(source(), repo, ["fr"], APPLY)).toMatchObject({ hidden: 0 });
  });

  it("shows again what the source publishes again, listed or not", async () => {
    await repo.setWithdrawn(idOf(1), "fr", "2026-09-20T02:00:00Z");
    await repo.setWithdrawn(idOf(3), "fr", "2026-09-20T02:00:00Z");
    const report = await reconcileWithdrawals(source(), repo, ["fr"], APPLY);
    expect(report.restored).toBe(2);
    expect(await hidden()).toEqual([urlOf("depublie"), urlOf("retire")]);
  });

  it("never reads another institution's articles on this site, nor hides them", async () => {
    // A ministry's article, at an address presidence.sn does not know (12/10/2026).
    const sourceUrl = "https://www.fonctionpublique.gouv.sn/?Article-fictif";
    const ministry = article(6, "retire");
    await repo.save({
      ...ministry,
      publisher: "fonction-publique",
      sourceUrl,
      translations: ministry.translations.map((translation) => ({ ...translation, sourceUrl })),
    });
    const provider = source();
    const report = await reconcileWithdrawals(provider, repo, ["fr"], APPLY);
    expect(report.missing.map((entry) => entry.sourceUrl)).not.toContain(sourceUrl);
    expect(provider.read.filter((slug) => slug === "retire")).toHaveLength(1);
    expect(await hidden()).not.toContain(sourceUrl);
  });

  it("changes nothing when only asked for a report", async () => {
    const report = await reconcileWithdrawals(source(), repo, ["fr"], { ...APPLY, apply: false });
    expect(report.hidden).toBe(2);
    expect(await hidden()).toEqual([]);
  });

  it("refuses a site that cannot tell a withdrawn article apart", async () => {
    await expect(reconcileWithdrawals(blindSource(), repo, ["fr"], APPLY)).rejects.toThrow(
      "cannot tell a withdrawn article apart",
    );
  });

  it("stops reading again once its time budget is spent, and says so", async () => {
    // Each look at the clock takes a minute; the budget ends after the second article.
    let minutes = 0;
    const clock = () => new Date(NOW.getTime() + 60_000 * minutes++);
    const provider = source();
    const report = await reconcileWithdrawals(provider, repo, ["fr"], {
      ...APPLY,
      now: clock,
      deadline: NOW.getTime() + 90_000,
    });
    expect(provider.read).toHaveLength(2);
    expect(report.incomplete).toBe(true);
    // Without a budget, every missing version is read again.
    const unbounded = await reconcileWithdrawals(source(), repo, ["fr"], APPLY);
    expect(unbounded.incomplete).toBe(false);
  });

  it("hides nothing when too many articles vanish at once, and says so", async () => {
    for (let n = 10; n < 10 + MAX_HIDDEN_AT_ONCE; n += 1) {
      await repo.save(article(n, `retire-${String(n)}`));
    }
    const everythingGone = { ...source(), recheck: () => Promise.resolve("withdrawn" as const) };
    const report = await reconcileWithdrawals(everythingGone, repo, ["fr"], APPLY);
    expect(report).toMatchObject({ hidden: 0, suspicious: true });
    expect(await hidden()).toEqual([]);
  });
});

describe("reconcileWithdrawals on the newest listing pages only", () => {
  /** A listing of several pages whose first page shows these stored articles. */
  function recentListing(ids: number[]): SourceProvider & { read: string[] } {
    const provider = source();
    return {
      ...provider,
      listPage: (lang, page) =>
        Promise.resolve({
          lastPage: 5,
          refs: page === 1 ? ids.map((n) => ({ ...ref(n), lang })) : [],
        }),
    };
  }
  const ref = (n: number): SourceArticleRef => ({
    sourceId: n,
    slug: `article-${String(n)}`,
    lang: "fr",
    sourceUpdatedAt: "",
    coverSourceUrl: null,
  });
  const RECENT = { ...APPLY, listingPages: 1 };

  it("reads again only the unlisted articles newer than the window's oldest", async () => {
    await repo.save(article(10, "liste", "2026-10-10"));
    await repo.save(article(11, "retire", "2026-10-12"));
    await repo.save(article(12, "meme-jour", "2026-10-10"));
    const provider = recentListing([10]);
    const report = await reconcileWithdrawals(provider, repo, ["fr"], RECENT);
    // Articles 1 to 5 (January) and the one of the window's last day are not read.
    expect(provider.read).toEqual(["retire"]);
    expect(report.hidden).toBe(1);
  });

  it("ignores a pinned old post at the top of the listing", async () => {
    await repo.save(article(10, "liste", "2026-10-10"));
    await repo.save(article(11, "retire", "2026-10-12"));
    // A post of June 2025 pinned first, article 10 last on the page: the January
    // articles 2 to 5 stay outside the window.
    await repo.save(article(20, "epingle", "2025-06-01"));
    const provider = recentListing([20, 10]);
    await reconcileWithdrawals(provider, repo, ["fr"], RECENT);
    expect(provider.read).toEqual(["retire"]);
  });

  it("reads nothing again when the window shows no dated article we store", async () => {
    const provider = recentListing([99]);
    const report = await reconcileWithdrawals(provider, repo, ["fr"], RECENT);
    expect(provider.read).toEqual([]);
    expect(report.missing).toEqual([]);
  });
});

describe("nextWithdrawalCheck", () => {
  const at = new Date("2026-10-16T02:30:00Z");
  const target = (institution: Institution, checkable = true) => ({
    institution,
    langs: ["fr"] as const,
    provider: checkable ? source() : blindSource(),
  });

  it("takes the first institution due whose site can be checked, one at a time", () => {
    const targets = [target("presidence"), target("sante", false), target("justice")];
    const checked = new Map<Institution, Date>([["presidence", new Date("2026-10-16T02:05:00Z")]]);
    expect(nextWithdrawalCheck(targets, checked, at)?.institution).toBe("justice");
    expect(nextWithdrawalCheck(targets, new Map(), at)?.institution).toBe("presidence");
  });

  it("waits for the quiet hours and for the next night", () => {
    const targets = [target("justice")];
    expect(nextWithdrawalCheck(targets, new Map(), new Date("2026-10-16T12:00:00Z"))).toBeNull();
    const checked = new Map<Institution, Date>([["justice", new Date("2026-10-16T02:05:00Z")]]);
    expect(nextWithdrawalCheck(targets, checked, at)).toBeNull();
  });

  it("reads the whole listing of presidence.sn only", () => {
    expect(listingPagesFor("presidence")).toBeUndefined();
    expect(listingPagesFor("primature")).toBe(3);
  });
});
