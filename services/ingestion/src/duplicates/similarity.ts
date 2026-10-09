import type { NewsArticle } from "@bgs/shared-types";
import sanitizeHtml from "sanitize-html";

/*
 * Same content published by two institutions (e.g. the Council of Ministers'
 * communiqué on presidence.sn and primature.sn): the words are the same, the titles
 * and the layout often are not. Compared on the words of the text, in order.
 */

/** Words of an article's original version: lower case, without accents or punctuation. */
export function wordsOf(article: NewsArticle): string[] {
  const original = article.translations.find((translation) => translation.lang === article.lang);
  const text = sanitizeHtml(`${original?.title ?? ""} ${original?.bodyHtml ?? ""}`, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

/** Groups of three consecutive words, from the opening of the text. */
function shingles(words: readonly string[], limit = 400): Set<string> {
  const set = new Set<string>();
  const end = Math.min(words.length, limit);
  for (let index = 0; index + 2 < end; index += 1) {
    set.add(`${words[index] ?? ""} ${words[index + 1] ?? ""} ${words[index + 2] ?? ""}`);
  }
  return set;
}

export interface TextOverlap {
  /** Share of the shorter text's word groups found in the other one, from 0 to 1. */
  shared: number;
  /** Size of the shorter text against the longer one, from 0 to 1. */
  lengthRatio: number;
}

/**
 * How much two texts overlap. A short note quoted inside a long communiqué shares all
 * its words but not the length (e.g. a nomination within a Council's communiqué).
 */
export function textOverlap(a: NewsArticle, b: NewsArticle): TextOverlap {
  const [left, right] = [shingles(wordsOf(a)), shingles(wordsOf(b))];
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  if (small.size === 0) {
    return { shared: 0, lengthRatio: 0 };
  }
  let shared = 0;
  for (const shingle of small) {
    if (large.has(shingle)) {
      shared += 1;
    }
  }
  return { shared: shared / small.size, lengthRatio: small.size / large.size };
}

/** Days between two publication days, or null when one of them is unknown. */
export function daysApart(a: NewsArticle, b: NewsArticle): number | null {
  if (a.sourcePublishedOn === null || b.sourcePublishedOn === null) {
    return null;
  }
  const ms = Math.abs(Date.parse(a.sourcePublishedOn) - Date.parse(b.sourcePublishedOn));
  return ms / 86_400_000;
}
