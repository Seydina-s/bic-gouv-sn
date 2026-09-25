import type { ArticleRepository } from "@bgs/content-store";
import { officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { MediaProcessingError } from "../lib/errors";
import type { SourceProvider } from "../sources/source-provider";
import type { MediaStorage } from "./media-storage";
import { processImage } from "./process-image";

/** `src` attributes of the sanitized article HTML (always double-quoted by sanitize-html). */
const IMG_SRC = /<img\b[^>]*\bsrc="([^"]+)"/g;

/**
 * Official images placed in the text of any language version, deduplicated, in order.
 * Images hosted elsewhere (social networks) are left out: never downloaded.
 */
export function inlineImageUrls(article: NewsArticle): string[] {
  const urls = article.translations.flatMap((translation) =>
    [...translation.bodyHtml.matchAll(IMG_SRC)].map((match) =>
      officialMediaUrl((match[1] ?? "").replaceAll("&amp;", "&")),
    ),
  );
  return [...new Set(urls.filter((url): url is string => url !== null))];
}

export interface InlineImagesResult {
  attached: number;
  failures: MediaProcessingError[];
}

/**
 * Stores lighter copies of the images placed in an article's text. Each image is
 * saved as soon as it is ready, so an interrupted run resumes where it stopped.
 * A failing image never blocks the others nor the article (reported, retried later).
 */
export async function attachInlineImages(
  article: NewsArticle,
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
): Promise<InlineImagesResult> {
  const stored = new Set(article.images.map((image) => image.originalUrl));
  const result: InlineImagesResult = { attached: 0, failures: [] };
  for (const url of inlineImageUrls(article).filter((candidate) => !stored.has(candidate))) {
    try {
      const original = await provider.downloadMedia(url);
      const { image } = await processImage(
        { original, sourceUrl: url, alt: null, role: "inline" },
        storage,
      );
      const latest = (await repository.get(article.id)) ?? article;
      await repository.setImages(article.id, [...latest.images, image]);
      result.attached += 1;
    } catch (cause) {
      result.failures.push(new MediaProcessingError(url, { cause }));
    }
  }
  return result;
}
