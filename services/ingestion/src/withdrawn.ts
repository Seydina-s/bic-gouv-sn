import type { ArticleRepository } from "@bgs/content-store";
import type { Lang } from "@bgs/shared-types";
import { QuarantineError, SourceUnreachableError } from "./lib/errors";
import { walkListing } from "./media/walk-listing";
import type { SourceProvider } from "./sources/source-provider";

/*
 * Articles the source no longer publishes (ING-03). User decision of 28/09/2026:
 * a withdrawn version is hidden from the app, kept in our store with its date, and
 * shown again if the source publishes it again. Being absent from the listing is
 * not enough (74 such versions were still online): the page is always read again.
 */

/** What a second reading of an article missing from the listing says. */
export type WithdrawalCheck = "withdrawn" | "still-published" | "unconfirmed";

export interface MissingArticle {
  id: string;
  lang: Lang;
  sourceUrl: string;
  check: WithdrawalCheck;
}

const PAGE_SIZE = 100;
/** Answers that mean the page is gone for good, not a passing failure. */
const GONE = new Set([404, 410]);

/** The last segment of an article's official address: how the source names it. */
function slugOf(sourceUrl: string): string {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments.at(-1) ?? "");
}

async function secondReading(
  provider: SourceProvider,
  sourceUrl: string,
  lang: Lang,
): Promise<WithdrawalCheck> {
  try {
    await provider.fetchArticle({
      sourceId: 0, // not needed to read one article
      slug: slugOf(sourceUrl),
      lang,
      sourceUpdatedAt: "",
      coverSourceUrl: null,
    });
    return "still-published";
  } catch (error) {
    if (
      error instanceof SourceUnreachableError &&
      error.status !== null &&
      GONE.has(error.status)
    ) {
      return "withdrawn";
    }
    if (error instanceof QuarantineError && error.reason.includes("not published")) {
      return "withdrawn";
    }
    return "unconfirmed";
  }
}

const HOUR = 60 * 60 * 1000;

/**
 * Once a night, in the quiet hours of Dakar (UTC+0, 2 h to 5 h): the full check
 * reads every listing page, too heavy for each pass, and withdrawals are rare.
 */
export function isWithdrawalCheckDue(now: Date, lastCheckAt: Date | null): boolean {
  const hour = now.getUTCHours();
  const quiet = hour >= 2 && hour < 5;
  return quiet && (lastCheckAt === null || now.getTime() - lastCheckAt.getTime() > 20 * HOUR);
}

export interface WithdrawalReport {
  /** Stored versions the listing no longer shows, with what reading them again said. */
  missing: MissingArticle[];
  /** Versions newly hidden: the source withdrew them. */
  hidden: number;
  /** Hidden versions shown again: the source publishes them again. */
  restored: number;
}

export interface ReconcileOptions {
  /** False: report only, change nothing (the `withdrawn --dry-run` command). */
  apply: boolean;
  now: () => Date;
}

async function listedIds(provider: SourceProvider, lang: Lang): Promise<Set<string>> {
  const ids = new Set<string>();
  await walkListing(provider, lang, (ref) => {
    ids.add(provider.articleIdFor(ref));
    return Promise.resolve();
  });
  return ids;
}

/**
 * Walks the whole source listing of each language, reads again every stored
 * version it no longer lists, then hides what the source withdrew and shows again
 * what it publishes again. About one request per listing page, plus one per
 * version missing from the listing. A passing failure changes nothing.
 */
export async function reconcileWithdrawals(
  provider: SourceProvider,
  repository: ArticleRepository,
  langs: readonly Lang[],
  { apply, now }: ReconcileOptions,
): Promise<WithdrawalReport> {
  const listed = new Map<Lang, Set<string>>();
  for (const lang of langs) {
    listed.set(lang, await listedIds(provider, lang));
  }
  const report: WithdrawalReport = { missing: [], hidden: 0, restored: 0 };
  const mark = async (id: string, lang: Lang, withdrawnAt: string | null) => {
    if (apply) {
      await repository.setWithdrawn(id, lang, withdrawnAt);
    }
  };
  let cursor: string | undefined;
  do {
    const page = await repository.list({ limit: PAGE_SIZE, cursor, includeWithdrawn: true });
    for (const article of page.items) {
      for (const translation of article.translations) {
        const ids = listed.get(translation.lang);
        if (ids === undefined || translation.status !== "official") {
          continue;
        }
        const hiddenNow = translation.withdrawnAt !== undefined;
        if (ids.has(article.id)) {
          if (hiddenNow) {
            await mark(article.id, translation.lang, null);
            report.restored += 1;
          }
          continue;
        }
        const sourceUrl = translation.sourceUrl ?? article.sourceUrl;
        const check = await secondReading(provider, sourceUrl, translation.lang);
        report.missing.push({ id: article.id, lang: translation.lang, sourceUrl, check });
        if (check === "withdrawn" && !hiddenNow) {
          await mark(article.id, translation.lang, now().toISOString());
          report.hidden += 1;
        } else if (check === "still-published" && hiddenNow) {
          await mark(article.id, translation.lang, null);
          report.restored += 1;
        }
      }
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return report;
}
