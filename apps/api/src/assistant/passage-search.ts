import type { Lang } from "@bgs/shared-types";
import { searchTerms, searchWords } from "../search/text-search";
import type { Passage } from "./passages";

/*
 * Lexical retrieval of passages with BM25, the classic ranking of search engines:
 * the free baseline of the assistant, later one half of a hybrid search with
 * vectors. Words rare in the base weigh more than common ones ("le", "ci"), so no
 * list of empty words is needed, in French or in Wolof. Case, accents and Wolof
 * letters are folded as in the app's search.
 */

/** Usual BM25 settings: how fast repeats stop counting, how much length matters. */
const K1 = 1.2;
const B = 0.75;
/** A title word counts as this many words of the text. */
const TITLE_WEIGHT = 2;
/**
 * French question words say how a question is asked, not what it is about; many
 * procedure titles start with "Comment…", which would outrank the subject itself.
 * Wolof ones are left in until a native speaker lists them (W-01).
 */
const QUESTION_WORDS: ReadonlySet<string> = new Set([
  "comment",
  "combien",
  "pourquoi",
  "quand",
  "quoi",
  "quel",
  "quelle",
  "quels",
  "quelles",
  "lequel",
  "laquelle",
  "lesquels",
  "lesquelles",
]);

export interface ScoredPassage {
  passage: Passage;
  score: number;
}

interface LanguageIndex {
  passages: Passage[];
  lengths: number[];
  averageLength: number;
  /** For each word, the passages containing it and how many times. */
  postings: Map<string, Map<number, number>>;
}

function indexOf(passages: Passage[]): LanguageIndex {
  const postings = new Map<string, Map<number, number>>();
  const lengths = passages.map((passage, position) => {
    const words = [
      ...Array.from({ length: TITLE_WEIGHT }, () => searchWords(passage.title)).flat(),
      ...searchWords(passage.text),
    ];
    for (const word of words) {
      const counts = postings.get(word) ?? new Map<number, number>();
      counts.set(position, (counts.get(position) ?? 0) + 1);
      postings.set(word, counts);
    }
    return words.length;
  });
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return { passages, lengths, averageLength: total / Math.max(passages.length, 1), postings };
}

export class PassageIndex {
  private readonly byLang = new Map<Lang, LanguageIndex>();

  constructor(passages: readonly Passage[]) {
    const grouped = new Map<Lang, Passage[]>();
    for (const passage of passages) {
      const group = grouped.get(passage.lang) ?? [];
      group.push(passage);
      grouped.set(passage.lang, group);
    }
    for (const [lang, group] of grouped) {
      this.byLang.set(lang, indexOf(group));
    }
  }

  /** Passages of `lang` matching `query`, best first; none when no word matches. */
  search(query: string, { lang, limit }: { lang: Lang; limit: number }): ScoredPassage[] {
    const index = this.byLang.get(lang);
    if (index === undefined) {
      return [];
    }
    const scores = new Map<number, number>();
    const count = index.passages.length;
    const terms = searchTerms(query).filter((term) => lang !== "fr" || !QUESTION_WORDS.has(term));
    for (const term of terms) {
      const counts = index.postings.get(term);
      if (counts === undefined) {
        continue;
      }
      const rarity = Math.log(1 + (count - counts.size + 0.5) / (counts.size + 0.5));
      for (const [position, frequency] of counts) {
        const length = index.lengths[position] ?? 0;
        const norm = K1 * (1 - B + (B * length) / index.averageLength);
        const gain = (rarity * frequency * (K1 + 1)) / (frequency + norm);
        scores.set(position, (scores.get(position) ?? 0) + gain);
      }
    }
    return [...scores]
      .sort(([a, scoreA], [b, scoreB]) => scoreB - scoreA || a - b)
      .slice(0, limit)
      .flatMap(([position, score]) => {
        const passage = index.passages[position];
        return passage === undefined ? [] : [{ passage, score }];
      });
  }
}
