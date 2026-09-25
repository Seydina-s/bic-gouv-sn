import type { NewsArticle } from "@bgs/shared-types";
import { contentHash } from "./lib/identity";

type Translations = NewsArticle["translations"];

/** Hash of what the reader sees: every translation, the day and the section. */
export function articleContentHash(
  translations: Translations,
  publishedOn: string | null,
  category: string,
): string {
  const ordered = [...translations]
    .sort((a, b) => a.lang.localeCompare(b.lang))
    .map(({ lang, status, title, bodyHtml }) => ({ lang, status, title, bodyHtml }));
  return contentHash({ translations: ordered, publishedOn, category });
}

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
    embedding: existing.embedding,
    version: existing.version,
    contentHash: articleContentHash(translations, incoming.sourcePublishedOn, incoming.category),
  };
}
