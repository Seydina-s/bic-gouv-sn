import type { Lang } from "@bgs/shared-types";
import { z } from "zod";
import type { AnswerCase } from "./answer-eval";
import type { AnswerStatus, AnswerTrace, GroundedAnswer } from "./grounded-answer";
import { periodDays, type NewsPeriod } from "./news-overview";
import type { Passage } from "./passages";
import { PASSAGES_GIVEN, questionIntent } from "./retrieval";
import type { RetrievalCase } from "./retrieval-eval";

/*
 * The assistant's weekly test bench (AST-30d, owner's decision of 17/10/2026, on the
 * condition that it makes the assistant better over time;
 * docs/cadrage/assistant-fiabilite.md). Every week about a hundred questions are
 * asked to the real assistant and checked without a person: answered with the right
 * page, fresh (the day's news, the latest Council), traps refused. Every failure joins
 * the known weaknesses, asked again each week until it passes twice in a row: an
 * error seen once is checked for good, and each fix is measured.
 */

export type BenchKind =
  | "news-period"
  | "council"
  | "procedure"
  | "service"
  | "search-direct"
  | "search-rephrased"
  | "search-citizen"
  | "trap";

export interface BenchCase {
  /** Stable while the question does not change: a weakness is followed by it. */
  id: string;
  kind: BenchKind;
  question: string;
  lang: Lang;
  accepted: AnswerStatus[];
  /** At least one of these pages must be cited (absent: any page). */
  sources?: string[] | undefined;
  /** Every page cited must be dated on or after this day (fresh news). */
  freshFrom?: string | undefined;
  /**
   * For "the latest" or "now" questions: a page newer than this day is right too,
   * the expected one having aged (bench of 17/10/2026: "dernier cm" failed for
   * citing a newer Council than the one written down).
   */
  orNewerThan?: string | undefined;
}

export interface BenchVerdict {
  id: string;
  kind: BenchKind;
  question: string;
  lang: Lang;
  status: AnswerStatus | "failed";
  passed: boolean;
  /** Why it failed, in plain French for the team; null when it passed. */
  reason: string | null;
  /** Answered although no answer was accepted: must never happen. */
  invented: boolean;
  cited: { url: string; publishedOn: string | null }[];
  /** For a failure: what the model was given and replied (AST-39). */
  evidence?: BenchEvidence;
}

export interface BenchEvidence {
  searched: string;
  extracts: {
    number: number;
    title: string;
    url: string;
    publishedOn: string | null;
    text: string;
  }[];
  reply: string | null;
}

const SEARCH_KIND: Record<RetrievalCase["style"], BenchKind> = {
  direct: "search-direct",
  reformulated: "search-rephrased",
  citizen: "search-citizen",
};

/** A short stable id for a question. */
export function caseId(kind: BenchKind, lang: Lang, question: string): string {
  let hash = 0;
  for (const character of `${kind}|${lang}|${question}`) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return `${kind}-${hash.toString(36)}`;
}

function benchCase(c: Omit<BenchCase, "id">): BenchCase {
  return { id: caseId(c.kind, c.lang, c.question), ...c };
}

/** The ISO week number's parity: half of a fixed set one week, the other half the next. */
function weekParity(today: string): number {
  return Math.floor(Date.parse(`${today}T00:00:00Z`) / (7 * 24 * 60 * 60_000)) % 2;
}

/** One passage per page, newest first. */
function pages(passages: readonly Passage[], kind: Passage["kind"]): Passage[] {
  const seen = new Set<string>();
  return passages
    .filter((passage) => passage.kind === kind)
    .filter((passage) => {
      if (seen.has(passage.contentId)) {
        return false;
      }
      seen.add(passage.contentId);
      return true;
    });
}

/** Spread picks over a list, shifted each week so that the whole list is seen in time. */
function spread<T>(items: readonly T[], count: number, today: string): T[] {
  if (items.length <= count) {
    return [...items];
  }
  const step = Math.floor(items.length / count);
  const shift = Math.floor(Date.parse(`${today}T00:00:00Z`) / (7 * 24 * 60 * 60_000)) % step;
  return Array.from({ length: count }, (_, n) => items[n * step + shift]).filter(
    (item): item is T => item !== undefined,
  );
}

const PERIOD_QUESTIONS: readonly [NewsPeriod, Lang, string][] = [
  ["today", "fr", "Quelles sont les actualités du jour ?"],
  ["today", "en", "What's the news today?"],
  ["today", "wo", "Lan mooy xibaar yi tey ?"],
  ["week", "fr", "Qu'a fait le gouvernement cette semaine ?"],
];

/**
 * The day from which a fresh answer about `period` cites its pages. Nothing published
 * in the period: the newest articles are given (`periodNews`), and any of them may be
 * cited; only the newest day was accepted, which failed a sound Sunday answer citing
 * Saturday and Friday (bench of 25/10/2026).
 */
function freshDay(news: readonly Passage[], period: NewsPeriod, today: string): string {
  const days = periodDays(period, today);
  const dated = news
    .flatMap((passage) => passage.publishedOn ?? [])
    .filter((d) => d <= today)
    .sort((a, b) => b.localeCompare(a));
  if (days !== null && dated.some((day) => day >= days.from)) {
    return days.from;
  }
  return dated.slice(0, PASSAGES_GIVEN).at(-1) ?? "0000-00-00";
}

/** Questions drawn from the base itself: they follow it without upkeep. */
export function generatedCases(passages: readonly Passage[], today: string): BenchCase[] {
  const news = pages(passages, "news-article");
  const period = PERIOD_QUESTIONS.map(([name, lang, question]) =>
    benchCase({
      kind: "news-period",
      question,
      lang,
      accepted: ["answered"],
      freshFrom: freshDay(news, name, today),
    }),
  );
  const councils = news
    .filter(
      (passage) => passage.section === "conseil-des-ministres" && passage.publishedOn !== null,
    )
    .sort((a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""));
  const latestCouncil = councils[0];
  const council =
    latestCouncil === undefined
      ? []
      : [
          benchCase({
            kind: "council",
            question: "Qu'a décidé le dernier Conseil des ministres ?",
            lang: "fr",
            accepted: ["answered"],
            sources: [latestCouncil.sourceUrl],
          }),
        ];
  // "Demander un passeport" becomes "Comment demander un passeport ?".
  const procedures = spread(
    pages(passages, "procedure").filter((p) =>
      /^(demander|obtenir|faire|déclarer)\b/i.test(p.title),
    ),
    8,
    today,
  ).map((procedure) =>
    benchCase({
      kind: "procedure",
      question: `Comment ${procedure.title.charAt(0).toLowerCase()}${procedure.title.slice(1)} ?`,
      lang: "fr",
      accepted: ["answered"],
      sources: [procedure.sourceUrl],
    }),
  );
  // With its town, as people ask: "Hôtel de ville" alone names hundreds of offices.
  const located = pages(passages, "service").flatMap((service) => {
    const town = townOf(service);
    return town === null ? [] : [{ service, town }];
  });
  const services = spread(located, 4, today).map(({ service, town }) =>
    benchCase({
      kind: "service",
      question: service.title.toLowerCase().includes(town.toLowerCase())
        ? `Où se trouve ${service.title} ?`
        : `Où se trouve ${service.title} à ${town} ?`,
      lang: "fr",
      accepted: ["answered"],
      sources: [service.sourceUrl],
    }),
  );
  return [...period, ...council, ...procedures, ...services];
}

/** The town of a service, as its extract gives it after the address; null if none. */
function townOf(service: Passage): string | null {
  // "Rue…, Dakar": the town follows the address; a lone address names no town.
  const parts = (service.text.split("\n")[1] ?? "").split(", ");
  const town = parts.length >= 2 ? (parts.at(-1)?.trim() ?? "") : "";
  // The country is no town ("…, Sénégal").
  return town.length >= 2 && !/\d/.test(town) && !/^s[ée]n[ée]gal$/i.test(town) ? town : null;
}

/**
 * Half of the retrieval test set each week, the other half the next. `dateOf` gives
 * the date of an expected page, for the questions about the latest or the present.
 */
export function retrievalCases(
  cases: readonly RetrievalCase[],
  today: string,
  dateOf: (url: string) => string | null = () => null,
): BenchCase[] {
  const parity = weekParity(today);
  return cases
    .filter((_, index) => index % 2 === parity)
    .map((c) => {
      const intent = questionIntent(c.question);
      const dates = c.expected.flatMap((url) => dateOf(url) ?? []);
      const oldest = dates.reduce<string | null>((a, b) => (a === null || b < a ? b : a), null);
      return benchCase({
        kind: SEARCH_KIND[c.style],
        question: c.question,
        lang: c.lang,
        accepted: ["answered"],
        sources: c.expected,
        ...((intent.recent || intent.current) && oldest !== null ? { orNewerThan: oldest } : {}),
      });
    });
}

/** The "zero invention" traps (data/assistant-answer-eval.json), every week. */
export function trapCases(cases: readonly AnswerCase[]): BenchCase[] {
  return cases.map((c) =>
    benchCase({
      kind: c.accepted.includes("answered") ? "search-direct" : "trap",
      question: c.question,
      lang: "fr",
      accepted: c.accepted,
      ...(c.sources === undefined ? {} : { sources: c.sources }),
    }),
  );
}

/** Checks one reply against its case. */
export function judgeBench(c: BenchCase, answer: GroundedAnswer | null): BenchVerdict {
  const cited = (answer?.sources ?? []).map((source) => ({
    url: source.sourceUrl,
    publishedOn: source.publishedOn,
  }));
  const base = { id: c.id, kind: c.kind, question: c.question, lang: c.lang, cited };
  if (answer === null) {
    return {
      ...base,
      status: "failed",
      passed: false,
      reason: "Le service n'a pas répondu.",
      invented: false,
    };
  }
  const invented = answer.status === "answered" && !c.accepted.includes("answered");
  const reason = failure(c, answer, cited);
  return { ...base, status: answer.status, passed: reason === null, reason, invented };
}

/**
 * A failure keeps the extracts the model was numbered and its reply as written (AST-39):
 * a refusal that comes and goes ("Ankara", "visa pour le Canada") is then read from the
 * run itself, whether the right page was missing or the model set it aside.
 */
export function withEvidence(verdict: BenchVerdict, trace: AnswerTrace | null): BenchVerdict {
  if (verdict.passed || trace === null) {
    return verdict;
  }
  return {
    ...verdict,
    evidence: {
      searched: trace.searched,
      extracts: trace.given.map((passage, index) => ({
        number: index + 1,
        title: passage.title,
        url: passage.sourceUrl,
        publishedOn: passage.publishedOn,
        text: passage.text,
      })),
      reply: trace.reply,
    },
  };
}

function failure(
  c: BenchCase,
  answer: GroundedAnswer,
  cited: BenchVerdict["cited"],
): string | null {
  if (!c.accepted.includes(answer.status)) {
    return answer.status === "answered"
      ? "A répondu alors qu'il devait refuser."
      : `A répondu « ${answer.status === "not_found" ? "introuvable" : "hors sujet"} » à une question qui a sa réponse dans la base.`;
  }
  if (answer.status !== "answered") {
    return null;
  }
  const newer = c.orNewerThan;
  const newerCited =
    newer !== undefined && cited.some(({ publishedOn }) => (publishedOn ?? "") > newer);
  if (
    c.sources !== undefined &&
    !newerCited &&
    !cited.some(({ url }) => c.sources?.includes(url) === true)
  ) {
    return "N'a pas cité la page attendue.";
  }
  const freshFrom = c.freshFrom;
  if (freshFrom !== undefined && cited.some(({ publishedOn }) => (publishedOn ?? "") < freshFrom)) {
    return `A cité une page plus ancienne que le ${freshFrom}.`;
  }
  return null;
}

/** Pass rate by kind of question, and the traps answered (target: none). */
export function summarizeBench(verdicts: readonly BenchVerdict[]) {
  const byKind: Partial<Record<BenchKind, { cases: number; passed: number }>> = {};
  for (const verdict of verdicts) {
    const kind = (byKind[verdict.kind] ??= { cases: 0, passed: 0 });
    kind.cases += 1;
    kind.passed += verdict.passed ? 1 : 0;
  }
  return {
    cases: verdicts.length,
    passed: verdicts.filter((verdict) => verdict.passed).length,
    invented: verdicts.filter((verdict) => verdict.invented).length,
    byKind,
  };
}

const KINDS = [
  "news-period",
  "council",
  "procedure",
  "service",
  "search-direct",
  "search-rephrased",
  "search-citizen",
  "trap",
] as const satisfies readonly BenchKind[];

export const weaknessSchema = z.object({
  case: z.object({
    id: z.string(),
    kind: z.enum(KINDS),
    question: z.string(),
    lang: z.enum(["fr", "wo", "en"]),
    accepted: z.array(z.enum(["answered", "not_found", "out_of_scope"])),
    sources: z.array(z.string()).optional(),
    freshFrom: z.string().optional(),
    orNewerThan: z.string().optional(),
  }),
  /** When it first failed, its last reason, and how many runs it passed since. */
  since: z.string(),
  reason: z.string(),
  passedInARow: z.int().nonnegative(),
});
export type Weakness = z.infer<typeof weaknessSchema>;

/** Passed this many runs in a row, a weakness is considered fixed. */
export const FIXED_AFTER = 2;

/**
 * The known weaknesses asked again, except those already among this week's questions
 * (the day's news is asked every week, against that week's news).
 */
export function weaknessCases(
  weaknesses: readonly Weakness[],
  asked: readonly BenchCase[],
  current: readonly BenchCase[] = [],
): BenchCase[] {
  const ids = new Set(asked.map((c) => c.id));
  // Judged as the bench judges it today, when the question is still among its cases.
  const now = new Map(current.map((c) => [c.id, c]));
  return weaknesses.map(({ case: c }) => now.get(c.id) ?? c).filter((c) => !ids.has(c.id));
}

/**
 * The weaknesses after a run: every failure joins them (or stays, its streak reset);
 * a weakness passed FIXED_AFTER runs in a row leaves them. Returns them and those fixed.
 */
export function updateWeaknesses(
  previous: readonly Weakness[],
  cases: readonly BenchCase[],
  verdicts: readonly BenchVerdict[],
  today: string,
): { weaknesses: Weakness[]; fixed: Weakness[] } {
  const verdictOf = new Map(verdicts.map((verdict) => [verdict.id, verdict]));
  const known = new Map(previous.map((weakness) => [weakness.case.id, weakness]));
  const next = new Map<string, Weakness>();
  const fixed: Weakness[] = [];
  for (const weakness of previous) {
    const verdict = verdictOf.get(weakness.case.id);
    if (verdict === undefined) {
      next.set(weakness.case.id, weakness);
    } else if (verdict.passed) {
      const passedInARow = weakness.passedInARow + 1;
      if (passedInARow >= FIXED_AFTER) {
        fixed.push({ ...weakness, passedInARow });
      } else {
        next.set(weakness.case.id, { ...weakness, passedInARow });
      }
    } else {
      next.set(weakness.case.id, {
        ...weakness,
        reason: verdict.reason ?? weakness.reason,
        passedInARow: 0,
      });
    }
  }
  for (const c of cases) {
    const verdict = verdictOf.get(c.id);
    if (verdict !== undefined && !verdict.passed && !known.has(c.id)) {
      next.set(c.id, { case: c, since: today, reason: verdict.reason ?? "", passedInARow: 0 });
    }
  }
  return { weaknesses: [...next.values()], fixed };
}
