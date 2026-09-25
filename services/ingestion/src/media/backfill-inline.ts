import type { ArticleRepository } from "@bgs/content-store";
import type { SourceProvider } from "../sources/source-provider";
import { attachInlineImages } from "./attach-inline";
import type { MediaStorage } from "./media-storage";

export interface InlineBackfillProgress {
  articles: number;
  attached: number;
  failures: { ref: string; code: string; message: string }[];
}

const PAGE_SIZE = 100;

/**
 * Stores the images placed in the text of every stored article, reading our own
 * store (no listing request to the source). Resumable: stored images are skipped.
 */
export async function backfillInlineImages(
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
  onArticle?: (progress: InlineBackfillProgress) => void,
): Promise<InlineBackfillProgress> {
  const progress: InlineBackfillProgress = { articles: 0, attached: 0, failures: [] };
  let cursor: string | undefined;
  do {
    const page = await repository.list({ limit: PAGE_SIZE, cursor });
    for (const article of page.items) {
      const { attached, failures } = await attachInlineImages(
        article,
        provider,
        repository,
        storage,
      );
      progress.articles += 1;
      progress.attached += attached;
      progress.failures.push(
        ...failures.map((failure) => ({
          ref: article.sourceUrl,
          code: failure.code,
          message: failure.message,
        })),
      );
      onArticle?.(progress);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return progress;
}
