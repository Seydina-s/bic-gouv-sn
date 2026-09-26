/*
 * Provisional full-text matching shared by the news and the procedures search
 * (Meilisearch replaces it in production, with typo tolerance, behind the same
 * routes). Case and accents are ignored, so "senegal" finds "Sénégal" and Wolof
 * letters (ë, ñ, ŋ) match their plain forms; every word typed must appear.
 */

const TITLE_WEIGHT = 3;

/** Lowercase, without diacritics, markup or punctuation, single-spaced. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ŋ/g, "n")
    .replace(/Ŋ/g, "n")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchTerms(query: string): string[] {
  return [
    ...new Set(
      normalizeForSearch(query)
        .split(" ")
        // Numbers always count ("Conseil du 3 septembre"); lone letters do not.
        .filter((term) => term.length >= 2 || /^\p{N}+$/u.test(term)),
    ),
  ];
}

function occurrences(haystack: string, term: string): number {
  let count = 0;
  for (let at = haystack.indexOf(term); at !== -1; at = haystack.indexOf(term, at + term.length)) {
    count += 1;
  }
  return count;
}

/** Relevance of a text (title first), or 0 when one of the terms is missing. */
export function scoreText(title: string, body: string, terms: readonly string[]): number {
  if (terms.length === 0) {
    return 0;
  }
  const normalizedTitle = normalizeForSearch(title);
  const normalizedBody = normalizeForSearch(body);
  let score = 0;
  for (const term of terms) {
    const hits =
      occurrences(normalizedTitle, term) * TITLE_WEIGHT + occurrences(normalizedBody, term);
    if (hits === 0) {
      return 0;
    }
    score += hits;
  }
  return score;
}
