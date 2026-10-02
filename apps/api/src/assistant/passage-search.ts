import type { Lang } from "@bgs/shared-types";
import { searchTerms, searchWords } from "../search/text-search";
import { frenchStem } from "./french-stem";
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

/** French words are cut to their stem; Wolof ones are kept whole until a native speaker
 * describes their endings (W-01). */
function stemmerOf(lang: Lang): (word: string) => string {
  return lang === "fr" ? frenchStem : (word) => word;
}

/**
 * The passages of one language. Passages are added and removed one content at a
 * time (a new or corrected article), never by rebuilding everything: the search
 * stays fast while the collection runs.
 */
class LanguageIndex {
  /** Indexed passages by position; a removed one leaves an empty slot. */
  private readonly passages: (Passage | undefined)[] = [];
  private readonly words: string[][] = [];
  /** For each word, the positions of the passages containing it and how many times. */
  private readonly postings = new Map<string, Map<number, number>>();
  private readonly positionsByContent = new Map<string, number[]>();
  private totalLength = 0;
  private count = 0;

  constructor(private readonly stem: (word: string) => string) {}

  add(passage: Passage): void {
    const position = this.passages.length;
    const words = [
      ...Array.from({ length: TITLE_WEIGHT }, () => searchWords(passage.title)).flat(),
      ...searchWords(passage.text),
    ].map(this.stem);
    for (const word of words) {
      const counts = this.postings.get(word) ?? new Map<number, number>();
      counts.set(position, (counts.get(position) ?? 0) + 1);
      this.postings.set(word, counts);
    }
    this.passages.push(passage);
    this.words.push(words);
    this.positionsByContent.set(passage.contentId, [
      ...(this.positionsByContent.get(passage.contentId) ?? []),
      position,
    ]);
    this.totalLength += words.length;
    this.count += 1;
  }

  removeContent(contentId: string): void {
    for (const position of this.positionsByContent.get(contentId) ?? []) {
      const words = this.words[position] ?? [];
      for (const word of new Set(words)) {
        const counts = this.postings.get(word);
        counts?.delete(position);
        if (counts?.size === 0) {
          this.postings.delete(word);
        }
      }
      this.passages[position] = undefined;
      this.words[position] = [];
      this.totalLength -= words.length;
      this.count -= 1;
    }
    this.positionsByContent.delete(contentId);
  }

  search(terms: ReadonlySet<string>, limit: number): ScoredPassage[] {
    const averageLength = this.totalLength / Math.max(this.count, 1);
    const scores = new Map<number, number>();
    for (const term of terms) {
      const counts = this.postings.get(this.stem(term));
      if (counts === undefined) {
        continue;
      }
      const rarity = Math.log(1 + (this.count - counts.size + 0.5) / (counts.size + 0.5));
      for (const [position, frequency] of counts) {
        const length = this.words[position]?.length ?? 0;
        const norm = K1 * (1 - B + (B * length) / averageLength);
        const gain = (rarity * frequency * (K1 + 1)) / (frequency + norm);
        scores.set(position, (scores.get(position) ?? 0) + gain);
      }
    }
    return [...scores]
      .sort(([a, scoreA], [b, scoreB]) => scoreB - scoreA || a - b)
      .slice(0, limit)
      .flatMap(([position, score]) => {
        const passage = this.passages[position];
        return passage === undefined ? [] : [{ passage, score }];
      });
  }
}

export class PassageIndex {
  private readonly byLang = new Map<Lang, LanguageIndex>();

  constructor(passages: readonly Passage[]) {
    for (const passage of passages) {
      this.languageOf(passage.lang).add(passage);
    }
  }

  private languageOf(lang: Lang): LanguageIndex {
    const existing = this.byLang.get(lang);
    if (existing !== undefined) {
      return existing;
    }
    const created = new LanguageIndex(stemmerOf(lang));
    this.byLang.set(lang, created);
    return created;
  }

  /**
   * The passages of one content, after it was published, corrected or withdrawn:
   * its previous passages, in every language, are replaced by `passages` (none
   * when withdrawn).
   */
  replaceContent(contentId: string, passages: readonly Passage[]): void {
    for (const index of this.byLang.values()) {
      index.removeContent(contentId);
    }
    for (const passage of passages) {
      this.languageOf(passage.lang).add(passage);
    }
  }

  /** Passages of `lang` matching `query`, best first; none when no word matches. */
  search(query: string, { lang, limit }: { lang: Lang; limit: number }): ScoredPassage[] {
    const index = this.byLang.get(lang);
    if (index === undefined) {
      return [];
    }
    const asked = searchTerms(query).filter((term) => lang !== "fr" || !QUESTION_WORDS.has(term));
    return index.search(new Set(asked), limit);
  }
}
