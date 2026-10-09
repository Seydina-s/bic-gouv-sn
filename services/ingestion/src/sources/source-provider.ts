import type { CircuitSnapshot } from "@bgs/resilience";
import type { Lang, NewsArticle } from "@bgs/shared-types";

/** Lightweight entry from a source's "latest" listing, enough to decide what to fetch. */
export interface SourceArticleRef {
  /**
   * Identifier of the article in the source system (shared by its FR and WO versions):
   * a number for presidence.sn, the page name for sites without ids (Primature).
   */
  sourceId: number | string;
  slug: string;
  lang: Lang;
  /**
   * Source's last-modification marker, used to detect new and edited articles: a time
   * for presidence.sn, the listed day for sites that give no time.
   */
  sourceUpdatedAt: string;
  /** Publication day shown by the listing, for sources whose article page has none. */
  publishedOn?: string | null;
  /** Cover photo on the source site, if any. */
  coverSourceUrl: string | null;
  /** Official documents (PDF) the source attaches to the article, outside its text. */
  documentUrls?: string[];
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
  /** State of the circuit breakers protecting this source, for the console. */
  circuits?(): CircuitSnapshot[];
  /** Fetches and normalizes one article; throws QuarantineError when it fails validation. */
  fetchArticle(ref: SourceArticleRef): Promise<NewsArticle>;
}
