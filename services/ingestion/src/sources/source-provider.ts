import type { Lang, NewsArticle } from "@bgs/shared-types";

/** Lightweight entry from a source's "latest" listing, enough to decide what to fetch. */
export interface SourceArticleRef {
  /** Identifier of the article in the source system (shared by its FR and WO versions). */
  sourceId: number;
  slug: string;
  lang: Lang;
  /** Source's last-modification time, used to detect new and edited articles. */
  sourceUpdatedAt: string;
}

/**
 * Any official source (presidence.sn API today; a Firecrawl or Playwright fallback
 * later) is read through this interface, so switching tools means one new adapter.
 */
export interface SourceProvider {
  listLatest(lang: Lang, page: number): Promise<SourceArticleRef[]>;
  /** Fetches and normalizes one article; throws QuarantineError when it fails validation. */
  fetchArticle(ref: SourceArticleRef): Promise<NewsArticle>;
}
