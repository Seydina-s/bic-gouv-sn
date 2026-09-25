import type { ArticleRepository } from "@bgs/content-store";
import { MediaProcessingError } from "../lib/errors";
import type { SourceArticleRef, SourceProvider } from "../sources/source-provider";
import type { MediaStorage } from "./media-storage";
import { processImage } from "./process-image";

export type CoverOutcome = "attached" | "already-done" | "no-cover" | "unknown-article";

/**
 * Downloads, processes and attaches the cover photo of an already stored article,
 * keeping the images placed in its text. The cover of the article's primary
 * language wins: another language version never replaces it. Media never blocks
 * content: failures are thrown as MediaProcessingError, callers keep the article
 * without image (graceful degradation).
 */
export async function attachCover(
  ref: SourceArticleRef,
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
): Promise<CoverOutcome> {
  const coverUrl = ref.coverSourceUrl;
  if (coverUrl === null) {
    return "no-cover";
  }
  const id = provider.articleIdFor(ref);
  const article = await repository.get(id);
  if (article === null) {
    return "unknown-article";
  }
  const cover = article.images.find((image) => image.role === "cover");
  if (cover?.originalUrl === coverUrl || (cover !== undefined && ref.lang !== article.lang)) {
    return "already-done";
  }
  try {
    const original = await provider.downloadMedia(coverUrl);
    const { image } = await processImage(
      { original, sourceUrl: coverUrl, alt: null, role: "cover" },
      storage,
    );
    // Re-read: processing takes seconds, the inline images may have changed meanwhile.
    const latest = (await repository.get(id)) ?? article;
    await repository.setImages(id, [
      image,
      ...latest.images.filter((existing) => existing.role !== "cover"),
    ]);
  } catch (cause) {
    throw new MediaProcessingError(coverUrl, { cause });
  }
  return "attached";
}
