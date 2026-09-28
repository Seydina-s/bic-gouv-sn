import type { ArticleRepository } from "@bgs/content-store";
import type { SourceProvider } from "../sources/source-provider";
import type { AttachMedia } from "./attach-result";
import type { MediaStorage } from "./media-storage";

export interface MediaBackfillProgress {
  articles: number;
  attached: number;
  failures: { ref: string; code: string; message: string }[];
}

const PAGE_SIZE = 100;

/**
 * Keeps our copy of one kind of file (images in the text, official documents) for
 * every stored article, reading our own store (no listing request to the source).
 * Resumable: files already stored are skipped.
 */
export async function backfillMedia(
  attach: AttachMedia,
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
  onArticle?: (progress: MediaBackfillProgress) => void,
): Promise<MediaBackfillProgress> {
  const progress: MediaBackfillProgress = { articles: 0, attached: 0, failures: [] };
  let cursor: string | undefined;
  do {
    const page = await repository.list({ limit: PAGE_SIZE, cursor });
    for (const article of page.items) {
      const { attached, failures } = await attach(article, provider, repository, storage);
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
