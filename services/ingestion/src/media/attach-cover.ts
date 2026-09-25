import type { ArticleRepository } from "@bgs/content-store";
import { MediaProcessingError } from "../lib/errors";
import type { SourceArticleRef, SourceProvider } from "../sources/source-provider";
import type { MediaStorage } from "./media-storage";
import { processImage } from "./process-image";

export type CoverOutcome = "attached" | "already-done" | "no-cover" | "unknown-article";

/**
 * Downloads, processes and attaches the cover photo of an already stored article.
 * The cover of the article's primary language wins: another language version never
 * replaces it. Media never blocks content: failures are thrown as
 * MediaProcessingError, callers keep the article without image (graceful degradation).
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
  const hasCover = article.images.length > 0;
  if (
    article.images.some((image) => image.originalUrl === coverUrl) ||
    (hasCover && ref.lang !== article.lang)
  ) {
    return "already-done";
  }
  try {
    const original = await provider.downloadMedia(coverUrl);
    const { image } = await processImage({ original, sourceUrl: coverUrl, alt: null }, storage);
    await repository.setImages(id, [image]);
  } catch (cause) {
    throw new MediaProcessingError(coverUrl, { cause });
  }
  return "attached";
}
