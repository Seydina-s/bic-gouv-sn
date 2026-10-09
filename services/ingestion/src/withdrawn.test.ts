import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuarantineError, SourceUnreachableError } from "./lib/errors";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";
import { isWithdrawalCheckDue, reconcileWithdrawals } from "./withdrawn";

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
const urlOf = (slug: string) => `https://www.presidence.sn/fr/actualites/${slug}/`;

function article(n: number, slug: string): NewsArticle {
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
    sourcePublishedOn: "2026-01-01",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, "2026-01-01", "communiques"),
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
    fetchArticle: (ref) => {
      read.push(ref.slug);
      if (ref.slug === "retire") {
        return Promise.reject(new SourceUnreachableError(urlOf(ref.slug), 404));
      }
      if (ref.slug === "depublie") {
        return Promise.reject(
          new QuarantineError(urlOf(ref.slug), "article is not published at the source"),
        );
      }
      if (ref.slug === "panne") {
        return Promise.reject(new SourceUnreachableError(urlOf(ref.slug), 503));
      }
      return Promise.resolve(article(3, ref.slug));
    },
  };
}

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
const APPLY = { apply: true, now: () => NOW };

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

  it("changes nothing when only asked for a report", async () => {
    const report = await reconcileWithdrawals(source(), repo, ["fr"], { ...APPLY, apply: false });
    expect(report.hidden).toBe(2);
    expect(await hidden()).toEqual([]);
  });
});
