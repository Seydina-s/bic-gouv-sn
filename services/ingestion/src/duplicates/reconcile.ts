import type { ArticleRepository, SaveOutcome } from "@bgs/content-store";
import { REFERENCE_INSTITUTION, type NewsArticle } from "@bgs/shared-types";
import { daysApart, textOverlap } from "./similarity";

/*
 * One content, one article (owner's decision of 09/10/2026): when the Présidence and
 * another institution publish the same text, the Présidence's version is shown and
 * the other is kept, hidden, as "also published by". Whichever is collected first.
 */

/**
 * Measured on the 374 Primature articles against presidence.sn (09/10/2026): every
 * repeat shares at least 0.74 of its word groups, every distinct article at most 0.25.
 */
export const SAME_CONTENT = 0.6;
/** Below this length ratio, the shorter text is a part of the other, not a repeat. */
export const MIN_LENGTH_RATIO = 0.5;
/** The same communiqué may appear a few days apart on two sites. */
export const MAX_DAYS_APART = 3;
const PAGE = 200;

export function isSameContent(a: NewsArticle, b: NewsArticle): boolean {
  const days = daysApart(a, b);
  if (days === null || days > MAX_DAYS_APART) {
    return false;
  }
  const overlap = textOverlap(a, b);
  return overlap.shared >= SAME_CONTENT && overlap.lengthRatio >= MIN_LENGTH_RATIO;
}

/** Stored articles published within MAX_DAYS_APART days of `article`, itself excluded. */
async function neighboursOf(
  repository: ArticleRepository,
  article: NewsArticle,
): Promise<NewsArticle[]> {
  const found: NewsArticle[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await repository.list({ limit: PAGE, cursor, includeWithdrawn: true });
    for (const other of page.items) {
      const days = daysApart(article, other);
      if (other.id !== article.id && days !== null && days <= MAX_DAYS_APART) {
        found.push(other);
      }
    }
    const oldest = page.items.at(-1)?.sourcePublishedOn ?? null;
    const pastWindow =
      oldest !== null &&
      article.sourcePublishedOn !== null &&
      Date.parse(article.sourcePublishedOn) - Date.parse(oldest) > MAX_DAYS_APART * 86_400_000;
    if (page.nextCursor === null || pastWindow) {
      return found;
    }
    cursor = page.nextCursor;
  }
}

async function markDuplicate(
  repository: ArticleRepository,
  duplicate: NewsArticle,
  reference: NewsArticle,
): Promise<void> {
  await repository.setDuplicateOf(duplicate.id, reference.id);
  const current = (await repository.get(reference.id)) ?? reference;
  const others = current.alsoPublishedBy.filter((other) => other.sourceUrl !== duplicate.sourceUrl);
  await repository.setAlsoPublishedBy(reference.id, [
    ...others,
    { publisher: duplicate.publisher, sourceUrl: duplicate.sourceUrl },
  ]);
}

/**
 * After `article` was saved: hides it if it repeats a Présidence article, or hides the
 * other institutions' articles it repeats. Returns the ids newly marked as duplicates.
 */
export async function reconcileDuplicates(
  repository: ArticleRepository,
  article: NewsArticle,
): Promise<string[]> {
  if (article.sourcePublishedOn === null) {
    return [];
  }
  const neighbours = await neighboursOf(repository, article);
  if (article.publisher !== REFERENCE_INSTITUTION) {
    const reference = neighbours.find(
      (other) => other.publisher === REFERENCE_INSTITUTION && isSameContent(other, article),
    );
    if (reference === undefined || article.duplicateOf === reference.id) {
      return [];
    }
    await markDuplicate(repository, article, reference);
    return [article.id];
  }
  const repeats = neighbours.filter(
    (other) =>
      other.publisher !== REFERENCE_INSTITUTION &&
      other.duplicateOf === undefined &&
      isSameContent(other, article),
  );
  for (const repeat of repeats) {
    await markDuplicate(repository, repeat, article);
  }
  return repeats.map((repeat) => repeat.id);
}

/** Saves a collected article, then applies the one-content-one-article rule. */
export async function saveCollected(
  repository: ArticleRepository,
  article: NewsArticle,
): Promise<SaveOutcome> {
  const outcome = await repository.save(article);
  if (outcome !== "unchanged") {
    await reconcileDuplicates(repository, (await repository.get(article.id)) ?? article);
  }
  return outcome;
}
