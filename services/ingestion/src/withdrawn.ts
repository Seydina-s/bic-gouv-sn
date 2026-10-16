import type { ArticleRepository } from "@bgs/content-store";
import type { Institution, Lang } from "@bgs/shared-types";
import { walkListing } from "./media/walk-listing";
import type { SourceProvider, WithdrawalCheck } from "./sources/source-provider";

/*
 * Articles the source no longer publishes (ING-03, ING-04). User decision of
 * 28/09/2026: a withdrawn version is hidden from the app, kept in our store with its
 * date, and shown again if the source publishes it again. Being absent from the
 * listing is not enough (74 such versions were still online): each site reads the
 * page again its own way (`SourceProvider.recheck`).
 */

export type { WithdrawalCheck };

export interface MissingArticle {
  id: string;
  lang: Lang;
  sourceUrl: string;
  check: WithdrawalCheck;
}

const PAGE_SIZE = 100;

/**
 * Listing pages read on any site but presidence.sn, whose interface is light enough
 * for the whole listing: ministry sites are slower, and their withdrawals concern
 * recent articles. Older articles are not checked there (decision of 16/10/2026).
 */
export const RECENT_PAGES = 3;

/**
 * More withdrawals at once on one site looks like a broken or rebuilt site, not an
 * editorial decision: nothing is hidden and the report says so.
 */
export const MAX_HIDDEN_AT_ONCE = 10;

const HOUR = 60 * 60 * 1000;

/**
 * Once a night per institution, in the quiet hours of Dakar (UTC+0, 2 h to 5 h): a
 * check reads several listing pages, too heavy for each pass, and withdrawals are rare.
 */
export function isWithdrawalCheckDue(now: Date, lastCheckAt: Date | null): boolean {
  const hour = now.getUTCHours();
  const quiet = hour >= 2 && hour < 5;
  return quiet && (lastCheckAt === null || now.getTime() - lastCheckAt.getTime() > 20 * HOUR);
}

export interface WithdrawalTarget {
  institution: Institution;
  provider: SourceProvider;
  langs: readonly Lang[];
}

/**
 * The next institution whose check is due, among those whose site can tell a
 * withdrawn article apart: one per pass, so that a pass stays short.
 */
export function nextWithdrawalCheck<T extends WithdrawalTarget>(
  targets: readonly T[],
  lastChecks: ReadonlyMap<Institution, Date>,
  now: Date,
): T | null {
  return (
    targets.find(
      ({ institution, provider }) =>
        provider.recheck !== undefined &&
        isWithdrawalCheckDue(now, lastChecks.get(institution) ?? null),
    ) ?? null
  );
}

/** Listing pages to read for an institution: all of them for presidence.sn only. */
export function listingPagesFor(institution: Institution): number | undefined {
  return institution === "presidence" ? undefined : RECENT_PAGES;
}

export interface WithdrawalReport {
  /** Stored versions the listing no longer shows, with what reading them again said. */
  missing: MissingArticle[];
  /** Versions newly hidden: the source withdrew them. */
  hidden: number;
  /** Hidden versions shown again: the source publishes them again. */
  restored: number;
  /** Too many withdrawals at once (MAX_HIDDEN_AT_ONCE): none was hidden. */
  suspicious: boolean;
}

export interface ReconcileOptions {
  /** False: report only, change nothing (the `withdrawn --dry-run` command). */
  apply: boolean;
  now: () => Date;
  /**
   * The institution whose site `provider` reads: only its own articles are checked
   * (12/10/2026: read again on presidence.sn, ministry articles were hidden as gone).
   */
  institution: Institution;
  /**
   * Listing pages read, newest first; undefined for the whole listing. With a limit,
   * only stored articles newer than the last one these pages show are checked.
   */
  listingPages?: number | undefined;
}

/** What the listing of one language shows, and which stored articles it covers. */
interface ListingWindow {
  ids: Set<string>;
  /**
   * Publication day the checked articles must come after; undefined when the whole
   * listing was read, null when the window holds no dated stored article (none checked).
   */
  after: string | null | undefined;
}

async function listingWindow(
  provider: SourceProvider,
  repository: ArticleRepository,
  lang: Lang,
  listingPages: number | undefined,
): Promise<ListingWindow> {
  const ordered: string[] = [];
  await walkListing(
    provider,
    lang,
    (ref) => {
      ordered.push(provider.articleIdFor(ref));
      return Promise.resolve();
    },
    { maxPages: listingPages },
  );
  const ids = new Set(ordered);
  if (listingPages === undefined) {
    return { ids, after: undefined };
  }
  // The oldest dated article the window shows that we store (pinned posts come first).
  for (const id of ordered.toReversed()) {
    const day = (await repository.get(id))?.sourcePublishedOn ?? null;
    if (day !== null) {
      return { ids, after: day };
    }
  }
  return { ids, after: null };
}

function covers(window: ListingWindow, publishedOn: string | null): boolean {
  if (window.after === undefined) {
    return true;
  }
  return window.after !== null && publishedOn !== null && publishedOn > window.after;
}

interface Change {
  id: string;
  lang: Lang;
}

/**
 * Walks the source listing of each language (whole, or its newest pages), reads
 * again every stored version of the institution it no longer lists, then hides what
 * the source withdrew and shows again what it publishes again. About one request per
 * listing page, plus one per version missing from it. A passing failure changes nothing.
 */
export async function reconcileWithdrawals(
  provider: SourceProvider,
  repository: ArticleRepository,
  langs: readonly Lang[],
  { apply, now, institution, listingPages }: ReconcileOptions,
): Promise<WithdrawalReport> {
  const recheck = provider.recheck?.bind(provider);
  if (recheck === undefined) {
    throw new Error(`The site of ${institution} cannot tell a withdrawn article apart`);
  }
  const windows = new Map<Lang, ListingWindow>();
  for (const lang of langs) {
    windows.set(lang, await listingWindow(provider, repository, lang, listingPages));
  }
  const missing: MissingArticle[] = [];
  const toHide: Change[] = [];
  const toRestore: Change[] = [];
  let cursor: string | undefined;
  do {
    const page = await repository.list({
      limit: PAGE_SIZE,
      cursor,
      publisher: institution,
      includeWithdrawn: true,
    });
    for (const article of page.items) {
      if (article.publisher !== institution) {
        continue;
      }
      for (const translation of article.translations) {
        const window = windows.get(translation.lang);
        if (window === undefined || translation.status !== "official") {
          continue;
        }
        const change = { id: article.id, lang: translation.lang };
        const hiddenNow = translation.withdrawnAt !== undefined;
        if (window.ids.has(article.id)) {
          if (hiddenNow) {
            toRestore.push(change);
          }
          continue;
        }
        if (!covers(window, article.sourcePublishedOn)) {
          continue;
        }
        const sourceUrl = translation.sourceUrl ?? article.sourceUrl;
        const check = await recheck(sourceUrl, translation.lang);
        missing.push({ ...change, sourceUrl, check });
        if (check === "withdrawn" && !hiddenNow) {
          toHide.push(change);
        } else if (check === "still-published" && hiddenNow) {
          toRestore.push(change);
        }
      }
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);

  const suspicious = toHide.length > MAX_HIDDEN_AT_ONCE;
  if (apply) {
    for (const { id, lang } of toRestore) {
      await repository.setWithdrawn(id, lang, null);
    }
    const withdrawnAt = now().toISOString();
    for (const { id, lang } of suspicious ? [] : toHide) {
      await repository.setWithdrawn(id, lang, withdrawnAt);
    }
  }
  return {
    missing,
    hidden: suspicious ? 0 : toHide.length,
    restored: toRestore.length,
    suspicious,
  };
}
