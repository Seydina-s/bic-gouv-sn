import type { ArticleRepository } from "@bgs/content-store";
import { errorCodeOf, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "./collect";
import { mergeArticle } from "./merge";
import type { SourceProvider } from "./sources/source-provider";

export interface BackfillProgress {
  lang: Lang;
  page: number;
  lastPage: number;
  created: number;
  updated: number;
  /** Already stored in this language: not fetched again. */
  skipped: number;
  failures: CollectionReport["failures"];
}

export interface BackfillOptions {
  /** Stop after this page (tests, partial runs). */
  maxPages?: number;
  onPage?: (progress: BackfillProgress) => void;
}

/**
 * Imports the whole history of one language, page after page (CLAUDE.md §4.4).
 * Idempotent and resumable: articles already stored in this language are skipped
 * without calling the source, so an interrupted run simply continues.
 * New publications during the run push items to later pages: they may be seen
 * twice (skipped the second time) but never missed going backwards.
 */
export async function backfill(
  provider: SourceProvider,
  repository: ArticleRepository,
  lang: Lang,
  { maxPages, onPage }: BackfillOptions = {},
): Promise<BackfillProgress> {
  const progress: BackfillProgress = {
    lang,
    page: 0,
    lastPage: 1,
    created: 0,
    updated: 0,
    skipped: 0,
    failures: [],
  };

  for (let page = 1; page <= Math.min(progress.lastPage, maxPages ?? Infinity); page += 1) {
    const listing = await provider.listPage(lang, page);
    progress.page = page;
    progress.lastPage = listing.lastPage;
    for (const ref of listing.refs) {
      const existing = await repository.get(provider.articleIdFor(ref));
      if (existing?.translations.some((translation) => translation.lang === lang) === true) {
        progress.skipped += 1;
        continue;
      }
      try {
        const outcome = await repository.save(
          mergeArticle(existing, await provider.fetchArticle(ref)),
        );
        if (outcome !== "unchanged") {
          progress[outcome] += 1;
        }
      } catch (error) {
        progress.failures.push({
          ref: ref.slug,
          code: errorCodeOf(error) ?? "UNKNOWN",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    onPage?.(progress);
  }
  return progress;
}
