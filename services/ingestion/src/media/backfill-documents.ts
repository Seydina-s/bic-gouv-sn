import type { ArticleRepository } from "@bgs/content-store";
import type { Lang } from "@bgs/shared-types";
import type { SourceProvider } from "../sources/source-provider";
import { attachDocuments } from "./attach-documents";
import type { MediaBackfillProgress } from "./backfill-media";
import type { MediaStorage } from "./media-storage";
import { walkListing, type WalkOptions } from "./walk-listing";

/**
 * Keeps our copy of the official PDFs of every stored article of one language:
 * those linked in the text and those the source attaches apart, which only its
 * listing gives. Resumable: documents already stored are skipped.
 */
export async function backfillDocuments(
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
  lang: Lang,
  options: WalkOptions = {},
): Promise<MediaBackfillProgress> {
  const progress: MediaBackfillProgress = { articles: 0, attached: 0, failures: [] };
  await walkListing(
    provider,
    lang,
    async (ref) => {
      const article = await repository.get(provider.articleIdFor(ref));
      if (article === null) {
        return;
      }
      const result = await attachDocuments(
        article,
        provider,
        repository,
        storage,
        ref.documentUrls ?? [],
      );
      progress.articles += 1;
      progress.attached += result.attached;
      progress.failures.push(
        ...result.failures.map((failure) => ({
          ref: article.sourceUrl,
          code: failure.code,
          message: failure.message,
        })),
      );
    },
    options,
  );
  return progress;
}
