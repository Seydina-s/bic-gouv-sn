import type { Inline, ProcedureDetail } from "@bgs/shared-types";
import {
  toProcedureSheet,
  type SectionKind,
  type SheetItem,
  type SheetSection,
} from "./procedure-sheet";

/*
 * The page of one procedure, arranged from its official sheet: the lead under the
 * title, the "En bref" facts, then the sections. A fact is either a figure the
 * source gives (fee, delay) or the source's own short answer, lifted word for word
 * (its section then leaves the page: it would only repeat it). Pure, so the
 * arrangement is tested without rendering.
 */

/** Facts of the "En bref" panel, in the order they are shown. */
export const BRIEF_ORDER = [
  "who",
  "documents",
  "cost",
  "time",
  "validity",
  "result",
  "where",
  "online",
] as const;
export type BriefKind = (typeof BRIEF_ORDER)[number];

export interface BriefFact {
  kind: BriefKind;
  value: string;
  /** Index in `sections` of the section the fact leads to (the documents to bring). */
  section: number | null;
}

/** The words the page needs, from the translator. */
export interface PageWords {
  eligibility: string;
  documents: string;
  fee: (amount: number) => string;
  delay: (days: number) => string;
  pieces: (count: number) => string;
  online: string;
}

export interface ProcedurePage {
  /** Under the title: the summary, or the opening paragraph when it starts with it. */
  lead: Inline[] | null;
  facts: BriefFact[];
  intro: SheetItem[];
  sections: SheetSection[];
}

/** Section kinds whose short answer can stand in the panel. */
const LIFTED = ["who", "cost", "time", "validity", "result", "where"] as const;
type LiftedKind = (typeof LIFTED)[number];
/** A short answer fits one or two lines of the panel. */
const BRIEF_MAX_LENGTH = 80;

function plain(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** The whole text of some sheet items on one line: for matching, never shown. */
export function plainOf(items: readonly SheetItem[]): string {
  return items
    .map((item) =>
      item.type === "text" || item.type === "note"
        ? plain(item.inlines)
        : item.type === "list"
          ? item.items.map(plain).join(" ")
          : "",
    )
    .join(" ");
}

/** Letters and digits only: compares two texts whatever their spaces, quotes or case. */
function letters(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function isLifted(kind: SectionKind): kind is LiftedKind {
  return LIFTED.some((lifted) => lifted === kind);
}

/** The whole answer of a section when it is one short line (a link is never lifted). */
function shortAnswer(section: SheetSection): string | null {
  const [only, ...rest] = section.items;
  if (only?.type !== "text" || rest.length > 0) {
    return null;
  }
  const text = plain(only.inlines);
  const linked = only.inlines.some((run) => run.href !== undefined);
  // "Tout Sénégalais né au Sénégal," is the start of an answer, not all of it.
  const unfinished = /[,;:]$/.test(text);
  return text.length <= BRIEF_MAX_LENGTH && !linked && !unfinished ? text : null;
}

/** The structured fields the sheet does not already cover, as sections of their own. */
function withStructuredFields(
  detail: ProcedureDetail,
  sections: readonly SheetSection[],
  words: PageWords,
): SheetSection[] {
  const covers = (kind: SectionKind) => sections.some((section) => section.kind === kind);
  const added: SheetSection[] = [];
  if (detail.eligibility !== null && !covers("who")) {
    added.push({
      title: words.eligibility,
      kind: "who",
      items: [{ type: "text", inlines: [{ text: detail.eligibility }] }],
    });
  }
  if (detail.documents.length > 0 && !covers("documents")) {
    added.push({
      title: words.documents,
      kind: "documents",
      items: [{ type: "list", ordered: false, items: detail.documents.map((text) => [{ text }]) }],
    });
  }
  return [...added, ...sections];
}

function leadOf(summary: string | null, intro: SheetItem[]) {
  const [first, ...rest] = intro;
  const given = summary !== null && letters(summary) !== "";
  if (
    given &&
    first?.type === "text" &&
    letters(plain(first.inlines)).startsWith(letters(summary))
  ) {
    return { lead: first.inlines, intro: rest };
  }
  return { lead: given ? [{ text: summary }] : null, intro };
}

/** Only the first section of a kind speaks for it: a later one may cover a detail. */
function liftShortAnswers(sections: readonly SheetSection[]) {
  const seen = new Set<SectionKind>();
  const lifted = new Map<LiftedKind, string>();
  const kept = sections.filter((section) => {
    const first = !seen.has(section.kind);
    seen.add(section.kind);
    const answer = first && isLifted(section.kind) ? shortAnswer(section) : null;
    if (answer !== null && isLifted(section.kind)) {
      lifted.set(section.kind, answer);
      return false;
    }
    return true;
  });
  return { kept, lifted };
}

function countPieces(section: SheetSection | undefined): number {
  return (section?.items ?? []).reduce(
    (count, item) => count + (item.type === "list" ? item.items.length : 0),
    0,
  );
}

/** Everything the procedure page shows, in its order. */
export function procedurePage(detail: ProcedureDetail, words: PageWords): ProcedurePage {
  const sheet = toProcedureSheet(detail.blocks);
  const { lead, intro } = leadOf(detail.summary, sheet.intro);
  const { kept: sections, lifted } = liftShortAnswers(
    withStructuredFields(detail, sheet.sections, words),
  );
  const documentsAt = sections.findIndex((section) => section.kind === "documents");
  const pieces = countPieces(sections[documentsAt]);
  const figure = {
    cost: detail.costFcfa === null ? undefined : words.fee(detail.costFcfa),
    time: detail.delayDays === null ? undefined : words.delay(detail.delayDays),
  };

  const factOf = (kind: BriefKind): BriefFact | null => {
    if (kind === "documents") {
      return pieces > 0 ? { kind, value: words.pieces(pieces), section: documentsAt } : null;
    }
    if (kind === "online") {
      return detail.online ? { kind, value: words.online, section: null } : null;
    }
    // The source's words first; its structured figure when it gives no short answer.
    const value =
      lifted.get(kind) ?? (kind === "cost" || kind === "time" ? figure[kind] : undefined);
    return value === undefined ? null : { kind, value, section: null };
  };

  return {
    lead,
    facts: BRIEF_ORDER.flatMap((kind) => factOf(kind) ?? []),
    intro,
    sections,
  };
}
