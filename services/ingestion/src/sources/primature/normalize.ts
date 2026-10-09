import { isoDateSchema, newsArticleSchema, type NewsArticle } from "@bgs/shared-types";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { isEmptied, sanitizeArticleHtml } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import { NEWS_PATH, PRIMATURE_ORIGIN, type ArticlePage } from "./parse";

/** Section of the Primature's site its news are listed in (docs/sources.md). */
export const PRIMATURE_NEWS_CATEGORY = "actualites";

/** Canonical page of an article, as its `<link rel="canonical">` gives it. */
export function primatureArticleUrl(slug: string): string {
  return `${PRIMATURE_ORIGIN}${NEWS_PATH}/${encodeURIComponent(slug)}`;
}

/** Stable id of a Primature article: its canonical address (idempotency, CLAUDE.md §4.4). */
export function primatureArticleId(slug: string): string {
  return stableUuid(primatureArticleUrl(slug));
}

export interface PrimatureContext {
  slug: string;
  /** Day the listing shows for the article; null when it shows none. */
  publishedOn: string | null;
  fetchedAt: string;
}

/**
 * Turns one Primature page into a validated NewsArticle, identical to the source in
 * its words. The Primature publishes in French only; photos are attached later by the
 * media steps, like for presidence.sn.
 */
export function normalizePrimature(
  page: ArticlePage | null,
  { slug, publishedOn, fetchedAt }: PrimatureContext,
): NewsArticle {
  const sourceUrl = primatureArticleUrl(slug);
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  if (page === null) {
    throw quarantine("no article in the page (source structure changed?)");
  }
  const bodyHtml = sanitizeArticleHtml(page.bodyHtml);
  if (page.title === "") {
    throw quarantine("article has no title");
  }
  if (isEmptied(bodyHtml)) {
    throw quarantine("article body is empty after sanitization");
  }
  const day = isoDateSchema.safeParse(publishedOn);
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title: page.title, bodyHtml, sourceUrl },
  ];
  const sourcePublishedOn = day.success ? day.data : null;
  const candidate: NewsArticle = {
    id: primatureArticleId(slug),
    kind: "news-article",
    publisher: "primature",
    alsoPublishedBy: [],
    category: PRIMATURE_NEWS_CATEGORY,
    sourceUrl,
    sourcePublishedOn,
    sourceUpdatedAt: null,
    fetchedAt,
    contentHash: articleContentHash(translations, sourcePublishedOn, PRIMATURE_NEWS_CATEGORY),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
  const result = newsArticleSchema.safeParse(candidate);
  if (!result.success) {
    throw quarantine(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}
