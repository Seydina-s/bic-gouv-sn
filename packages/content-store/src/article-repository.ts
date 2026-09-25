import type { Lang, NewsArticle } from "@bgs/shared-types";

export type SaveOutcome = "created" | "updated" | "unchanged";

export interface ListQuery {
  /** Only articles having a translation in this language. */
  lang?: Lang | undefined;
  limit: number;
  /** Opaque position returned by the previous page. */
  cursor?: string | undefined;
}

export interface ArticlePage {
  items: NewsArticle[];
  /** Null on the last page. */
  nextCursor: string | null;
}

/**
 * Storage of published articles. Implementations never overwrite silently: when the
 * content hash changes, the version is incremented and the previous one is kept.
 */
export interface ArticleRepository {
  get(id: string): Promise<NewsArticle | null>;
  /** Newest first: source publication day, then source update time. */
  list(query: ListQuery): Promise<ArticlePage>;
  save(article: NewsArticle): Promise<SaveOutcome>;
  /** Previous versions of an article, oldest first. */
  history(id: string): Promise<NewsArticle[]>;
  /**
   * Attaches processed images to the current version. Media is derived from the
   * source, not editorial content: no new version. Returns false if unknown.
   */
  setImages(id: string, images: NewsArticle["images"]): Promise<boolean>;
}

/** Sort key shared by every implementation: newest publication first, stable by id. */
export function compareNewestFirst(a: NewsArticle, b: NewsArticle): number {
  const byDay = (b.sourcePublishedOn ?? "").localeCompare(a.sourcePublishedOn ?? "");
  if (byDay !== 0) {
    return byDay;
  }
  const byUpdate = (b.sourceUpdatedAt ?? "").localeCompare(a.sourceUpdatedAt ?? "");
  return byUpdate !== 0 ? byUpdate : a.id.localeCompare(b.id);
}
