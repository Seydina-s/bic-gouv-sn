import type { ArticleRepository } from "@bgs/content-store";
import { errorCodeOf, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "../collect";
import type { SourceProvider } from "../sources/source-provider";
import { attachCover, type CoverOutcome } from "./attach-cover";
import type { MediaStorage } from "./media-storage";

export interface CoverBackfillProgress {
  lang: Lang;
  page: number;
  lastPage: number;
  outcomes: Record<CoverOutcome, number>;
  failures: CollectionReport["failures"];
}

export interface CoverBackfillOptions {
  maxPages?: number;
  onPage?: (progress: CoverBackfillProgress) => void;
}

/**
 * Attaches the cover photo of every stored article of one language, page after
 * page of the source listing. Resumable: covers already attached are skipped
 * without downloading anything.
 */
export async function backfillCovers(
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
  lang: Lang,
  { maxPages, onPage }: CoverBackfillOptions = {},
): Promise<CoverBackfillProgress> {
  const progress: CoverBackfillProgress = {
    lang,
    page: 0,
    lastPage: 1,
    outcomes: { attached: 0, "already-done": 0, "no-cover": 0, "unknown-article": 0 },
    failures: [],
  };
  while (progress.page < Math.min(progress.lastPage, maxPages ?? Number.POSITIVE_INFINITY)) {
    const { refs, lastPage } = await provider.listPage(lang, progress.page + 1);
    progress.page += 1;
    progress.lastPage = lastPage;
    for (const ref of refs) {
      try {
        progress.outcomes[await attachCover(ref, provider, repository, storage)] += 1;
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
