import { articleContentHash } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";

// The hash moved to @bgs/content-store (shared with the console's reviews).
export { articleContentHash };

/**
 * Merges a freshly collected language version into the stored article (same source
 * article id): the new version replaces its own language only. French is the
 * original language of presidence.sn whenever it is present.
 */
export function mergeArticle(existing: NewsArticle | null, incoming: NewsArticle): NewsArticle {
  if (existing === null) {
    return incoming;
  }
  const translations = [
    ...existing.translations.filter((t) => !incoming.translations.some((n) => n.lang === t.lang)),
    ...incoming.translations,
  ];
  const lang = translations.some((t) => t.lang === "fr") ? "fr" : existing.lang;
  const original = translations.find((t) => t.lang === lang);
  return {
    ...incoming,
    lang,
    sourceUrl: original?.sourceUrl ?? incoming.sourceUrl,
    translations,
    audio: existing.audio,
    // Derived media survive an editorial update; the media step refreshes them if needed.
    images: existing.images,
    // Marks of the one-content-one-article rule are ours, not the source's: kept.
    alsoPublishedBy: existing.alsoPublishedBy,
    ...(existing.duplicateOf === undefined ? {} : { duplicateOf: existing.duplicateOf }),
    embedding: existing.embedding,
    version: existing.version,
    contentHash: articleContentHash(translations, incoming.sourcePublishedOn, incoming.category),
  };
}
