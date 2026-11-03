import type { ArticleRepository, JsonDocument, VersionedEntry } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { allArticles } from "./translation/article-translation";
import { unpublishable } from "./lib/sanitize";

/*
 * Stored articles the publishing rules now refuse (DATA-10): rules added after a text
 * was collected never saw it. Listed first; deleted only by id, on the owner's
 * decision, each kept whole in a private document of the collection (never served).
 */

export interface RefusedArticle {
  id: string;
  publisher: NewsArticle["publisher"];
  publishedOn: string | null;
  title: string;
  sourceUrl: string;
  reason: string;
}

/** Why the current rules would not publish the article, or null. */
export function refusalOf(article: NewsArticle): RefusedArticle | null {
  for (const translation of article.translations) {
    if (translation.status === "machine") {
      continue;
    }
    const reason = unpublishable(translation.title, translation.bodyHtml, translation.lang);
    if (reason !== null) {
      return {
        id: article.id,
        publisher: article.publisher,
        publishedOn: article.sourcePublishedOn,
        title: translation.title,
        sourceUrl: article.sourceUrl,
        reason,
      };
    }
  }
  return null;
}

export async function refusedArticles(articles: ArticleRepository): Promise<RefusedArticle[]> {
  return (await allArticles(articles)).flatMap((article) => refusalOf(article) ?? []);
}

/** One deleted article as kept in the private document. */
export interface DiscardedEntry {
  discardedAt: string;
  reason: string;
  entry: VersionedEntry<NewsArticle>;
}

export interface DiscardOutcome {
  deleted: string[];
  /** Asked, but not refused by the rules (or unknown): left untouched. */
  kept: string[];
}

/**
 * Deletes the articles of `ids` that the rules refuse, each kept first in `kept`.
 * An id the rules accept is never deleted, whatever was asked.
 */
export async function discardArticles(
  articles: ArticleRepository,
  kept: JsonDocument,
  ids: readonly string[],
  now: () => Date,
): Promise<DiscardOutcome> {
  const refused = new Map((await refusedArticles(articles)).map((item) => [item.id, item]));
  const outcome: DiscardOutcome = { deleted: [], kept: [] };
  for (const id of ids) {
    const refusal = refused.get(id);
    const current = refusal === undefined ? null : await articles.get(id);
    if (refusal === undefined || current === null) {
      outcome.kept.push(id);
      continue;
    }
    // Kept before it is deleted: a failed write leaves the article in place.
    const discarded: DiscardedEntry = {
      discardedAt: now().toISOString(),
      reason: refusal.reason,
      entry: { current, history: await articles.history(id) },
    };
    await kept.update((saved) => ({
      next: [...(Array.isArray(saved) ? (saved as unknown[]) : []), discarded],
      result: null,
    }));
    await articles.remove(id);
    outcome.deleted.push(id);
  }
  return outcome;
}
