import type { Lang, NewsArticle } from "@bgs/shared-types";

/** Lightweight entry from a source's "latest" listing, enough to decide what to fetch. */
export interface SourceArticleRef {
  /** Identifier of the article in the source system (shared by its FR and WO versions). */
  sourceId: number;
  slug: string;
  lang: Lang;
  /** Source's last-modification time, used to detect new and edited articles. */
  sourceUpdatedAt: string;
  /** Cover photo on the source site, if any. */
  coverSourceUrl: string | null;
}

/** One page of a source listing, newest first. */
export interface SourcePage {
  refs: SourceArticleRef[];
  lastPage: number;
}

/**
 * Any official source (presidence.sn API today; a Firecrawl or Playwright fallback
 * later) is read through this interface, so switching tools means one new adapter.
 */
export interface SourceProvider {
  listPage(lang: Lang, page: number): Promise<SourcePage>;
  /** Id the stored article gets for this source item (same for all its languages). */
  articleIdFor(ref: SourceArticleRef): string;
  /** Downloads a media file from the source, with the same politeness and resilience. */
  downloadMedia(url: string): Promise<Buffer>;
  /** Fetches and normalizes one article; throws QuarantineError when it fails validation. */
  fetchArticle(ref: SourceArticleRef): Promise<NewsArticle>;
}
