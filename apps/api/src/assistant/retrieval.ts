import { INSTITUTIONS, type Institution, type Lang } from "@bgs/shared-types";
import { fuseRankings } from "./hybrid-search";
import type { PassageIndex, ScoredPassage } from "./passage-search";
import { membersNamed } from "./government";
import { newsPeriod, periodDays, type NewsPeriod } from "./news-overview";
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
/** Newest extracts naming a minister, for a news question about a portfolio. */
const MEMBER_NEWEST = 3;
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
  finances: { cues: [" finances ", " budget ", " dette ", " tresor "], ministry: true },
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
  /**
   * The ministers whose portfolio the question names, with their post (official
   * page of the Primature): their ministry may have no site of its own.
   */
  members: { name: string; post: string }[];
  /**
   * The news of a period asked, with no other subject ("les actualités du jour"):
   * answered from the newest articles, not by words (17/10/2026).
   */
  period: NewsPeriod | null;
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
    members: membersNamed(text).map(({ name, post }) => ({ name, post })),
    period: newsPeriod(text),
  };
}

/** The question, plus the minister and post of each portfolio it names. */
function withMembers(question: string, intent: QuestionIntent): string {
  return [question, ...intent.members.map(({ name, post }) => `${name} ${post}`)].join(" ");
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

/**
 * The languages searched: a question outside French also reads the French pages, where
 * every official text is (16/10/2026: an English question found nothing, the English
 * versions not existing yet).
 */
export function searchedLanguages(lang: Lang): Lang[] {
  return lang === "fr" ? ["fr"] : [lang, "fr"];
}

function byWords(index: PassageIndex, question: string, lang: Lang): ScoredPassage[] {
  const rankings = searchedLanguages(lang).map((searched) =>
    index.search(question, { lang: searched, limit: CANDIDATES }),
  );
  return rankings.length === 1 ? (rankings[0] ?? []) : fuseRankings(rankings, CANDIDATES);
}

/** Newest first, undated last. */
function byNewest(a: Passage, b: Passage): number {
  return (b.publishedOn ?? "").localeCompare(a.publishedOn ?? "");
}

/**
 * For a news question about a minister's portfolio without an institution of its
 * own: the newest extracts naming the minister (Conseil des ministres, other
 * institutions' articles).
 */
function newestNamingMembers(index: PassageIndex, lang: Lang, intent: QuestionIntent): Passage[] {
  if (!intent.recent || intent.publisher !== null || intent.members.length === 0) {
    return [];
  }
  return intent.members.flatMap(({ name }) => {
    // The whole name: "Bacary SARR", never another Sarr of the Government.
    const named = folded(name);
    return index
      .search(name, { lang, limit: CANDIDATES })
      .map(({ passage }) => passage)
      .filter((passage) => folded(passage.text).includes(named))
      .sort(byNewest)
      .slice(0, MEMBER_NEWEST);
  });
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
      : newestNamingMembers(index, searched, intent);
  });
}

/**
 * For the news of a period: the opening of each article of that period, newest
 * first, an article once whatever its languages. None in the period (nothing
 * published today): the newest ones, whose dates let the model say so.
 */
function periodNews(index: PassageIndex, lang: Lang, today: string, period: NewsPeriod): Passage[] {
  const latest = (days: { from: string; to: string } | null) => {
    const seen = new Set<string>();
    return searchedLanguages(lang)
      .flatMap((searched) =>
        index.latest({
          lang: searched,
          section: null,
          contents: PASSAGES_GIVEN,
          perContent: 1,
          from: days?.from ?? "0000",
          to: days?.to ?? today,
        }),
      )
      .filter((passage) => {
        if (seen.has(passage.contentId)) {
          return false;
        }
        seen.add(passage.contentId);
        return true;
      })
      .slice(0, PASSAGES_GIVEN);
  };
  const inPeriod = latest(periodDays(period, today));
  return inPeriod.length > 0 ? inPeriod : latest(null);
}

/** Pieces of one page among those given: more would crowd the other pages out. */
export const PER_PAGE = 2;

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
  {
    limit = PASSAGES_GIVEN,
    meaningWeight = MEANING_WEIGHT,
    period,
  }: { limit?: number; meaningWeight?: number; period?: NewsPeriod | null } = {},
): Passage[] {
  const intent = questionIntent(question);
  // Heard by the caller in the question's rephrasing, when given.
  const asked = period === undefined ? intent.period : period;
  if (asked !== null) {
    return periodNews(index, lang, today, asked).slice(0, limit);
  }
  const words = byWords(index, withMembers(widenQuestion(question), intent), lang);
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
  const named = newestNamed(index, lang, intent);
  const seen = new Set(named.map((passage) => passage.id));
  const perPage = new Map<string, number>();
  for (const passage of named) {
    perPage.set(passage.contentId, (perPage.get(passage.contentId) ?? 0) + 1);
  }
  // At most PER_PAGE pieces of a page found by the search (17/10/2026: up to 4 of 8
  // were pieces of one page); the newest of a section named keep theirs.
  const others = ranked.filter((passage) => {
    const pieces = perPage.get(passage.contentId) ?? 0;
    if (seen.has(passage.id) || pieces >= PER_PAGE) {
      return false;
    }
    seen.add(passage.id);
    perPage.set(passage.contentId, pieces + 1);
    return true;
  });
  return [...named, ...others].slice(0, limit);
}
