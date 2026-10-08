import type { Lang } from "@bgs/shared-types";
import { fuseRankings } from "./hybrid-search";
import type { PassageIndex, ScoredPassage } from "./passage-search";
import type { Passage } from "./passages";

/*
 * Which official extracts the model reads for a question (08/10/2026: questions
 * about "this week" or "the last Council of Ministers" found old articles, words
 * alone knowing nothing of time). Words still choose the extracts, the newest weigh
 * more, more so when the question asks for news; a section named in the question
 * brings its newest article, and a question about recent news the newest articles.
 */

/** Extracts given to the model: enough to answer, few enough to keep the cost low. */
export const PASSAGES_GIVEN = 8;
/** How much the meaning counts against the words in the fusion (chosen on the test set). */
export const MEANING_WEIGHT = 3;
/** Candidates found by words before the newest are favoured. */
const CANDIDATES = 40;
const DAY_MS = 24 * 60 * 60_000;

/** Folded like the search: lower case, no accents, apostrophes as spaces. */
function folded(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")} `;
}

const RECENT = [
  " dernier ",
  " derniere ",
  " derniers ",
  " dernieres ",
  " recent ",
  " recente ",
  " recents ",
  " recentes ",
  " recemment ",
  " cette semaine ",
  " ce mois ",
  " aujourd hui ",
  " hier ",
  " actuel ",
  " actuellement ",
  " en ce moment ",
  " ces derniers jours ",
];

const SECTIONS: readonly [string, string][] = [
  [" conseil des ministres ", "conseil-des-ministres"],
  [" conseil de ministres ", "conseil-des-ministres"],
  [" discours ", "discours"],
  [" interview ", "interviews"],
];

export interface QuestionIntent {
  /** The question is about recent news ("this week", "the last…"). */
  recent: boolean;
  /** The section the question names, if it names one. */
  section: string | null;
}

export function questionIntent(question: string): QuestionIntent {
  const text = folded(question);
  return {
    recent: RECENT.some((cue) => text.includes(cue)),
    section: SECTIONS.find(([cue]) => text.includes(cue))?.[1] ?? null,
  };
}

/** How much newer extracts weigh: a lot for a question about news, a little otherwise. */
function freshness(publishedOn: string | null, today: string, recent: boolean): number {
  if (publishedOn === null) {
    return 0;
  }
  const days = Math.max(0, (Date.parse(today) - Date.parse(publishedOn)) / DAY_MS);
  return recent ? 3 * Math.exp(-days / 10) : 0.15 * Math.exp(-days / 365);
}

/**
 * `byMeaning`: the passages closest in meaning, when the search by meaning is
 * ready; fused with the words by rank (AI-02: 94 % of right pages in the first 5,
 * against 88 % by words alone on the test set).
 */
export function retrievePassages(
  index: PassageIndex,
  question: string,
  lang: Lang,
  today: string,
  byMeaning: readonly ScoredPassage[] | null = null,
  { limit = PASSAGES_GIVEN, meaningWeight = MEANING_WEIGHT } = {},
): Passage[] {
  const intent = questionIntent(question);
  const words = index.search(question, { lang, limit: CANDIDATES });
  const candidates =
    byMeaning === null ? words : fuseRankings([words, byMeaning], CANDIDATES, [1, meaningWeight]);
  const byWords = candidates
    .map(({ passage, score }) => ({
      passage,
      score: score * (1 + freshness(passage.publishedOn, today, intent.recent)),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ passage }) => passage);
  const newest =
    intent.section !== null
      ? index.latest({ lang, section: intent.section, contents: 1, perContent: 4 })
      : intent.recent
        ? index.latest({ lang, section: null, contents: 5, perContent: 1 })
        : [];
  const seen = new Set<string>();
  return [...newest, ...byWords]
    .filter((passage) => {
      if (seen.has(passage.id)) {
        return false;
      }
      seen.add(passage.id);
      return true;
    })
    .slice(0, limit);
}
