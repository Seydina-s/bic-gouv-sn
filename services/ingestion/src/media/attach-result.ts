import type { ArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import type { MediaProcessingError } from "../lib/errors";
import type { SourceProvider } from "../sources/source-provider";
import type { MediaStorage } from "./media-storage";

/** What a pass over one article's files did: failures never block the article. */
export interface AttachResult {
  attached: number;
  failures: MediaProcessingError[];
}

/** Keeps our own copy of one kind of file an article points to (images, documents). */
export type AttachMedia = (
  article: NewsArticle,
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
) => Promise<AttachResult>;
