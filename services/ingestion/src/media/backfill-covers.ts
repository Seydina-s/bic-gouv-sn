import type { ArticleRepository } from "@bgs/content-store";
import { errorCodeOf, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "../collect";
import type { SourceProvider } from "../sources/source-provider";
import { attachCover, type CoverOutcome } from "./attach-cover";
import type { MediaStorage } from "./media-storage";
import { walkListing, type ListingPosition } from "./walk-listing";

export interface CoverBackfillProgress extends ListingPosition {
  lang: Lang;
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
  await walkListing(
    provider,
    lang,
    async (ref) => {
      try {
        progress.outcomes[await attachCover(ref, provider, repository, storage)] += 1;
      } catch (error) {
        progress.failures.push({
          ref: ref.slug,
          code: errorCodeOf(error) ?? "UNKNOWN",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    {
      ...(maxPages === undefined ? {} : { maxPages }),
      onPage: ({ page, lastPage }) => {
        progress.page = page;
        progress.lastPage = lastPage;
        onPage?.(progress);
      },
    },
  );
  return progress;
}
