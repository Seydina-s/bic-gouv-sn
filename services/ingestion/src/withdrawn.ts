import type { ArticleRepository } from "@bgs/content-store";
import type { Lang } from "@bgs/shared-types";
import { QuarantineError, SourceUnreachableError } from "./lib/errors";
import { walkListing } from "./media/walk-listing";
import type { SourceProvider } from "./sources/source-provider";

/*
 * Articles the source no longer publishes (ING-03, first step): a read-only report.
 * Nothing is hidden or changed here; what the app does with a withdrawn article is
 * the user's decision (A-FAIRE-UTILISATEUR.md, point 10).
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

/**
 * Walks the whole source listing of each language, then reads again every stored
 * version that it no longer lists. About one request per listing page, plus one
 * per missing article.
 */
export async function findWithdrawn(
  provider: SourceProvider,
  repository: ArticleRepository,
  langs: readonly Lang[],
): Promise<MissingArticle[]> {
  const listed = new Map<Lang, Set<string>>();
  for (const lang of langs) {
    const ids = new Set<string>();
    await walkListing(provider, lang, (ref) => {
      ids.add(provider.articleIdFor(ref));
      return Promise.resolve();
    });
    listed.set(lang, ids);
  }
  const missing: MissingArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await repository.list({ limit: PAGE_SIZE, cursor });
    for (const article of page.items) {
      for (const translation of article.translations) {
        const ids = listed.get(translation.lang);
        if (ids === undefined || ids.has(article.id) || translation.status !== "official") {
          continue;
        }
        const sourceUrl = translation.sourceUrl ?? article.sourceUrl;
        missing.push({
          id: article.id,
          lang: translation.lang,
          sourceUrl,
          check: await secondReading(provider, sourceUrl, translation.lang),
        });
      }
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return missing;
}
