/*
 * Provisional full-text matching shared by the news and the procedures search
 * (Meilisearch replaces it in production, behind the same routes). Case and accents
 * are ignored, so "senegal" finds "Sénégal" and Wolof letters (ë, ñ, ŋ) match their
 * plain forms; every word typed must appear, exactly or with a typo (Meilisearch's
 * defaults: one from 5 letters, two from 9). Numbers must match exactly.
 */
import { foldForMatching } from "@bgs/shared-types";

const TITLE_WEIGHT = 3;
/** A word found with a typo counts less than the word itself. */
const TYPO_WEIGHT = 0.5;
const ONE_TYPO_FROM = 5;
const TWO_TYPOS_FROM = 9;

/** Typos allowed for a term of this length. */
export function typosAllowed(term: string): number {
  if (/\p{N}/u.test(term) || term.length < ONE_TYPO_FROM) {
    return 0;
  }
  return term.length < TWO_TYPOS_FROM ? 1 : 2;
}

/**
 * Whether `a` becomes `b` with at most `max` edits (a letter added, removed,
 * replaced, or two neighbours swapped). Gives up as soon as a row exceeds `max`.
 */
export function withinTypos(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) {
    return false;
  }
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let distance = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        distance = Math.min(distance, (before[j - 2] ?? 0) + 1);
      }
      current.push(distance);
      best = Math.min(best, distance);
    }
    if (best > max) {
      return false;
    }
    before = previous;
    previous = current;
  }
  return (previous[b.length] ?? max + 1) <= max;
}

/** Lowercase, without diacritics, markup or punctuation, single-spaced. */
export function normalizeForSearch(text: string): string {
  return foldForMatching(text)
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

/** A text made ready for searching once, instead of at every search. */
export interface PreparedText {
  title: string;
  body: string;
  /** Distinct words and how often each appears, for typo matching. */
  titleWords: ReadonlyMap<string, number>;
  bodyWords: ReadonlyMap<string, number>;
}

function wordCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of text.split(" ")) {
    if (word !== "") {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return counts;
}

export function prepareText(title: string, body: string): PreparedText {
  const normalizedTitle = normalizeForSearch(title);
  const normalizedBody = normalizeForSearch(body);
  return {
    title: normalizedTitle,
    body: normalizedBody,
    titleWords: wordCounts(normalizedTitle),
    bodyWords: wordCounts(normalizedBody),
  };
}

function occurrences(haystack: string, term: string): number {
  let count = 0;
  for (let at = haystack.indexOf(term); at !== -1; at = haystack.indexOf(term, at + term.length)) {
    count += 1;
  }
  return count;
}

/** Known words that are `term` with the typos its length allows. */
export type NearWords = (term: string) => ReadonlySet<string>;

/** Near words found by scanning one text's own words (no shared vocabulary). */
function nearWordsIn(text: PreparedText): NearWords {
  return (term) => {
    const max = typosAllowed(term);
    const near = new Set<string>();
    if (max > 0) {
      for (const word of [...text.titleWords.keys(), ...text.bodyWords.keys()]) {
        if (withinTypos(term, word, max)) {
          near.add(word);
        }
      }
    }
    return near;
  };
}

function countOf(words: ReadonlyMap<string, number>, near: ReadonlySet<string>): number {
  let count = 0;
  for (const word of near) {
    count += words.get(word) ?? 0;
  }
  return count;
}

/** Relevance of a prepared text (title first), or 0 when one of the terms is missing. */
export function scorePrepared(
  text: PreparedText,
  terms: readonly string[],
  nearWords: NearWords = nearWordsIn(text),
): number {
  if (terms.length === 0) {
    return 0;
  }
  let score = 0;
  for (const term of terms) {
    let hits = occurrences(text.title, term) * TITLE_WEIGHT + occurrences(text.body, term);
    if (hits === 0) {
      const near = nearWords(term);
      hits =
        (countOf(text.titleWords, near) * TITLE_WEIGHT + countOf(text.bodyWords, near)) *
        TYPO_WEIGHT;
    }
    if (hits === 0) {
      return 0;
    }
    score += hits;
  }
  return score;
}

/** What to search in an item: a key that changes with its content, its words. */
export interface Searchable {
  key: string;
  title: string;
  body: () => string;
}

/**
 * Prepared texts kept between searches, under a key that changes with the content
 * (id and content hash): an edited text is prepared again. Typos are looked up
 * once per search in the words of every prepared text, not text by text. Bounded:
 * emptied when full (stale versions go too).
 */
export class PreparedTexts {
  private readonly texts = new Map<string, PreparedText>();
  private readonly vocabulary = new Set<string>();

  constructor(private readonly max = 20_000) {}

  get(key: string, title: string, body: () => string): PreparedText {
    const known = this.texts.get(key);
    if (known !== undefined) {
      return known;
    }
    if (this.texts.size >= this.max) {
      this.texts.clear();
      this.vocabulary.clear();
    }
    const prepared = prepareText(title, body());
    this.texts.set(key, prepared);
    for (const word of [...prepared.titleWords.keys(), ...prepared.bodyWords.keys()]) {
      this.vocabulary.add(word);
    }
    return prepared;
  }

  /** Near words of each term, looked up in the whole vocabulary once, on demand. */
  private nearWords(): NearWords {
    const found = new Map<string, Set<string>>();
    return (term) => {
      let near = found.get(term);
      if (near === undefined) {
        const max = typosAllowed(term);
        near = new Set(
          max === 0 ? [] : [...this.vocabulary].filter((word) => withinTypos(term, word, max)),
        );
        found.set(term, near);
      }
      return near;
    };
  }

  /** Items matching every term, best first; their given order breaks ties. */
  rank<T>(
    items: readonly T[],
    terms: readonly string[],
    describe: (item: T) => Searchable | null,
  ): T[] {
    // Every text prepared before any lookup: the vocabulary is then complete.
    const texts = items.map((item) => {
      const searchable = describe(item);
      return searchable === null
        ? null
        : this.get(searchable.key, searchable.title, searchable.body);
    });
    const nearWords = this.nearWords();
    return items
      .map((item, rank) => {
        const text = texts[rank];
        return {
          item,
          rank,
          score: text === undefined || text === null ? 0 : scorePrepared(text, terms, nearWords),
        };
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.rank - b.rank)
      .map((hit) => hit.item);
  }
}
