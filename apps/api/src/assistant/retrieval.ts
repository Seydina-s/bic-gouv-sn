import { INSTITUTIONS, type Institution, type Lang } from "@bgs/shared-types";
import { fuseRankings } from "./hybrid-search";
import type { PassageIndex, ScoredPassage } from "./passage-search";
import { publisherLabel, type Passage } from "./passages";
import { widenQuestion } from "./question-words";

/*
 * Which official extracts the model reads for a question. Words and meaning choose
 * the extracts; the date and the institution named in the question reorder them:
 * - news questions ("this week", "the last…") favour the newest extracts on the
 *   subject (08/10/2026);
 * - questions about who holds a post ("c ki le premier ministre", "le DG actuel du
 *   BIC") favour recent ones too, more slowly: an appointment stays true for months;
 * - an institution named ("le ministère de l'Intérieur") brings its own articles.
 * Until 11/10/2026 a news question also received the five newest articles of the
 * whole base, whatever their subject: once the ministries were collected, these
 * crowded the subject out and the assistant answered "not found" (owner's report).
 */

/** Extracts given to the model: enough to answer, few enough to keep the cost low. */
export const PASSAGES_GIVEN = 8;
/** How much the meaning counts against the words in the fusion (chosen on the test set). */
export const MEANING_WEIGHT = 3;
/** Candidates found by words before the newest are favoured. */
const CANDIDATES = 40;
/** How much more the articles of an institution named in the question weigh. */
const PUBLISHER_BOOST = 1.5;
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
  " ces derniers jours ",
];

/** Questions about who holds a post or how things stand now. */
const CURRENT = [
  " qui ",
  " actuel ",
  " actuelle ",
  " actuellement ",
  " en ce moment ",
  " nouveau ",
  " nouvelle ",
  " composition ",
  " membres du gouvernement ",
  " ministres du gouvernement ",
  " ministeres ",
];

const SECTIONS: readonly [string, string][] = [
  [" conseil des ministres ", "conseil-des-ministres"],
  [" conseil de ministres ", "conseil-des-ministres"],
  [" discours ", "discours"],
  [" interview ", "interviews"],
];

/**
 * Words naming an institution. A ministry is named only with "ministre" or
 * "ministère" in the question ("la justice sociale" is not the ministry).
 */
const NAMED: Readonly<Record<Institution, { cues: readonly string[]; ministry: boolean }>> = {
  presidence: { cues: [" president ", " presidence ", " chef de l etat "], ministry: false },
  primature: { cues: [" premier ministre ", " primature "], ministry: false },
  justice: { cues: [" justice ", " garde des sceaux "], ministry: true },
  "industrie-commerce": { cues: [" industrie ", " commerce "], ministry: true },
  energie: { cues: [" energie ", " petrole "], ministry: true },
  hydraulique: { cues: [" hydraulique ", " assainissement "], ministry: true },
  agriculture: { cues: [" agriculture "], ministry: true },
  peches: { cues: [" peche ", " peches ", " economie maritime "], ministry: true },
  "emploi-formation": { cues: [" emploi ", " formation professionnelle "], ministry: true },
  interieur: { cues: [" interieur ", " securite publique "], ministry: true },
  sante: { cues: [" sante ", " hygiene publique "], ministry: true },
  "forces-armees": { cues: [" forces armees ", " armee ", " armees "], ministry: true },
  culture: { cues: [" culture ", " artisanat ", " tourisme "], ministry: true },
  "enseignement-superieur": {
    cues: [" enseignement superieur ", " recherche ", " innovation "],
    ministry: true,
  },
  numerique: { cues: [" numerique ", " telecommunications "], ministry: true },
  infrastructures: { cues: [" infrastructures "], ministry: true },
  "affaires-etrangeres": {
    cues: [" affaires etrangeres ", " integration africaine ", " diplomatie "],
    ministry: true,
  },
  economie: { cues: [" economie ", " plan ", " cooperation "], ministry: true },
  "fonction-publique": {
    cues: [" fonction publique ", " travail ", " reforme du service public "],
    ministry: true,
  },
  famille: { cues: [" famille ", " action sociale ", " solidarites ", " femme "], ministry: true },
  education: {
    cues: [" education nationale ", " education ", " ecole ", " ecoles "],
    ministry: true,
  },
};

export interface QuestionIntent {
  /** The question is about recent news ("this week", "the last…"). */
  recent: boolean;
  /** The question is about who holds a post, or how things stand now. */
  current: boolean;
  /** The section the question names, if it names one. */
  section: string | null;
  /** The institution the question names, as the passages name it; null if none. */
  publisher: string | null;
}

function namedPublisher(text: string): string | null {
  const ministry = text.includes(" minist");
  const named = INSTITUTIONS.find((institution) => {
    const { cues, ministry: needsMinistry } = NAMED[institution];
    return (!needsMinistry || ministry) && cues.some((cue) => text.includes(cue));
  });
  return named === undefined ? null : publisherLabel(named);
}

export function questionIntent(question: string): QuestionIntent {
  const text = folded(widenQuestion(question));
  return {
    recent: RECENT.some((cue) => text.includes(cue)),
    current: CURRENT.some((cue) => text.includes(cue)),
    section: SECTIONS.find(([cue]) => text.includes(cue))?.[1] ?? null,
    publisher: namedPublisher(text),
  };
}

/** How much newer extracts weigh: a lot for news, some for current posts, a little otherwise. */
function freshness(publishedOn: string | null, today: string, intent: QuestionIntent): number {
  if (publishedOn === null) {
    return 0;
  }
  const days = Math.max(0, (Date.parse(today) - Date.parse(publishedOn)) / DAY_MS);
  if (intent.recent) {
    return 3 * Math.exp(-days / 10);
  }
  return intent.current ? 2 * Math.exp(-days / 120) : 0.15 * Math.exp(-days / 365);
}

/** The languages searched: a Wolof question also reads the French pages (procedures…). */
export function searchedLanguages(lang: Lang): Lang[] {
  return lang === "wo" ? ["wo", "fr"] : [lang];
}

function byWords(index: PassageIndex, question: string, lang: Lang): ScoredPassage[] {
  const rankings = searchedLanguages(lang).map((searched) =>
    index.search(question, { lang: searched, limit: CANDIDATES }),
  );
  return rankings.length === 1 ? (rankings[0] ?? []) : fuseRankings(rankings, CANDIDATES);
}

/** The newest articles of the section or institution named, for a news question. */
function newestNamed(index: PassageIndex, lang: Lang, intent: QuestionIntent): Passage[] {
  return searchedLanguages(lang).flatMap((searched) => {
    if (intent.section !== null) {
      return index.latest({ lang: searched, section: intent.section, contents: 1, perContent: 4 });
    }
    return intent.recent && intent.publisher !== null
      ? index.latest({
          lang: searched,
          section: null,
          publisher: intent.publisher,
          contents: 3,
          perContent: 1,
        })
      : [];
  });
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
  const words = byWords(index, widenQuestion(question), lang);
  const candidates =
    byMeaning === null ? words : fuseRankings([words, byMeaning], CANDIDATES, [1, meaningWeight]);
  const ranked = candidates
    .map(({ passage, score }) => ({
      passage,
      score:
        score *
        (1 + freshness(passage.publishedOn, today, intent)) *
        (intent.publisher !== null && passage.publisher === intent.publisher ? PUBLISHER_BOOST : 1),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ passage }) => passage);
  const seen = new Set<string>();
  return [...newestNamed(index, lang, intent), ...ranked]
    .filter((passage) => {
      if (seen.has(passage.id)) {
        return false;
      }
      seen.add(passage.id);
      return true;
    })
    .slice(0, limit);
}
