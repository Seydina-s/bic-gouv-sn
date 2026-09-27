import type { Block, Inline } from "@bgs/shared-types";

/*
 * e-senegal.sn writes its procedures as plain paragraphs: its sub-headings are
 * questions ("Qui peut demander… ?", "Où s'adresser ?"), its lists are paragraphs
 * starting with "•", its remarks start with "NB :". This module recognises that
 * structure so the app can lay it out its own way. The official wording is never
 * changed: a paragraph may be cut where a line or a question ends, and only what
 * is layout (list markers, the "NB" prefix, a heading's number) is taken off.
 */

/** What a section is about, to give it the right icon and layout. */
export type SectionKind =
  | "who"
  | "when"
  | "documents"
  | "cost"
  | "time"
  | "validity"
  | "where"
  | "how"
  | "problem"
  | "result"
  | "duty"
  | "legal"
  | "more"
  | "info";

export type SheetItem =
  | { type: "text"; inlines: Inline[] }
  | { type: "note"; inlines: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "block"; block: Block };

export interface SheetSection {
  title: string;
  kind: SectionKind;
  items: SheetItem[];
}

export interface ProcedureSheet {
  /** What comes before the first question: the procedure in a few words. */
  intro: SheetItem[];
  sections: SheetSection[];
}

const HEADING_MAX_LENGTH = 150;
/** A heading without "?" (or a question after a statement) is short: never a sentence. */
const SHORT_HEADING_MAX_LENGTH = 90;
const LIST_ENTRY_MAX_LENGTH = 240;
const BULLET = /^(?:[•·▪◦‣*]\s*|[-–—]\s+)/;
const NOTE = /^n\s?\.?\s?b\s?\.?\s*:\s*/i;
/** "1- Qui peut… ?", "2. Où… ?": the source's numbering of its headings. */
const HEADING_NUMBER = /^\d+\s*[-.)]\s*/;
const QUESTION_OPENERS =
  /^(qui|quel|quelle|quels|quelles|quand|ou|comment|combien|que faire|pourquoi)\b/;
const HEADING_PHRASES =
  /^(pour en savoir plus|services? a contacter|service\(s\) a contacter|textes? de reference|duree de validite)/;
/** A heading phrase running on into its content: "Pour en savoir plus… Direction des…". */
const PHRASE_THEN_TEXT =
  /^\s*(?:pour en savoir plus|services? [àa] contacter|service\(s\) [àa] contacter|textes? de r[ée]f[ée]rence)\s*(?:…|\.{2,}|:)\s*(?=\S)/iu;
/** A question mark followed by the start of another sentence: its answer. */
const QUESTION_END = /\?\s+(?=[\p{Lu}\d«"(])/gu;
/** A question's first word, followed by what may follow a word. */
const ASKING = String.raw`(?:[àa] qui|qui|quel(?:le)?s?|quand|o[ùu]|comment|combien|que faire|pourquoi)(?=[\s'’?,])`;
const ASKING_CAPITALISED = String.raw`(?:À qui|A qui|Qui|Quel(?:le)?s?|Quand|Où|Comment|Combien|Que faire|Pourquoi)(?=[\s'’?,])`;
/**
 * Where a question starts after a statement, even when the source forgot the space
 * ("attribution.Comment renouveler ?"), the full stop ("domaines Quel est le délai ?")
 * or the capital (". quelles sont les pièces ?").
 */
const QUESTION_STARTS = [
  new RegExp(String.raw`[.!]\s*(?=${ASKING})`, "giu"),
  new RegExp(String.raw`\p{Ll}\s+(?=${ASKING_CAPITALISED})`, "gu"),
];

/** Heading words → kind, in order: the question word, when there is one, says it best. */
const KIND_RULES: readonly (readonly [SectionKind, RegExp])[] = [
  ["where", /^ou\b|adresser/],
  ["who", /^(a )?qui\b|^dans quels? cas\b|condition/],
  ["when", /^quan[dt]\b/],
  ["time", /^combien de temps\b/],
  ["cost", /^combien\b/],
  ["how", /^comment\b/],
  ["cost", /\bcout|\bprix\b|\bfrais\b|tarif|montant|\btaux\b/],
  ["validity", /validite/],
  ["time", /delai|duree/],
  ["result", /\bnature\b|intitule|pieces? (obtenues?|delivrees?)/],
  ["documents", /document|pieces?\b|fournir|dossier/],
  ["who", /beneficiaire|concern|peut (faire|demander|obtenir|beneficier|acquerir|initier)/],
  ["when", /\bdate\b|period|\bterme\b|\bheures?\b|horaire/],
  ["where", /deposer|\blieu/],
  ["how", /etape|procedure|renouvel|relancer|modalite/],
  ["duty", /obligation/],
  ["legal", /texte|reference|reglement|\bloi\b|decret|sanction/],
  ["problem", /perte|\bvol\b|refus|rejet|erreur|rectification|en cas de/],
  ["more", /savoir plus|contact|\bservices?\b/],
];

/** Lower case, no accents, apostrophes as spaces: for matching only, never shown. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainText(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** A line without the spaces at its two ends (they would show as an indent). */
function trimLine(runs: readonly Inline[]): Inline[] {
  const first = runs.findIndex((run) => run.text.trim() !== "");
  const last = runs.findLastIndex((run) => run.text.trim() !== "");
  return runs.slice(first, last + 1).map((run, index, kept) => {
    const start = index === 0 ? run.text.trimStart() : run.text;
    return { ...run, text: index === kept.length - 1 ? start.trimEnd() : start };
  });
}

/** The runs without a leading marker (bullet or "NB :"); null when there is none. */
function withoutPrefix(inlines: readonly Inline[], prefix: RegExp): Inline[] | null {
  const index = inlines.findIndex((run) => run.text.trim() !== "");
  const first = inlines[index];
  if (first === undefined) {
    return null;
  }
  const start = first.text.trimStart();
  const match = prefix.exec(start);
  if (match === null || match[0] === "") {
    return null;
  }
  const rest = { ...first, text: start.slice(match[0].length) };
  // "**NB :** Une taxe…": the space after a bold marker opens the next run.
  return trimLine([...inlines.slice(0, index), rest, ...inlines.slice(index + 1)]);
}

/** A paragraph that is really a sub-heading: a question, or a known heading phrase. */
export function isQuestionHeading(text: string): boolean {
  if (text.length === 0 || text.length > HEADING_MAX_LENGTH || BULLET.test(text)) {
    return false;
  }
  const normalized = normalize(text);
  if (NOTE.test(normalized)) {
    return false;
  }
  if (text.endsWith("?") || HEADING_PHRASES.test(normalized)) {
    return true;
  }
  const opener = QUESTION_OPENERS.exec(normalized)?.[1];
  // "Ou" without its accent means "or": only "Où" asks where.
  const asks = opener !== undefined && (opener !== "ou" || /^o[ùÙ]/i.test(text));
  return asks && text.length <= SHORT_HEADING_MAX_LENGTH && !/[.;,]$/.test(text);
}

/** The kind of a section, from the words of its heading. */
export function kindOf(title: string): SectionKind {
  const text = normalize(title).replace(HEADING_NUMBER, "");
  return KIND_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "info";
}

/** The runs cut at the given offsets (ascending) of their joined text, formatting kept. */
function cutAt(runs: readonly Inline[], offsets: readonly number[]): Inline[][] {
  const pieces: Inline[][] = [];
  const pending = [...offsets];
  let piece: Inline[] = [];
  let position = 0;
  for (const run of runs) {
    let rest = run.text;
    let cut = pending[0];
    while (cut !== undefined && cut < position + rest.length) {
      const head = rest.slice(0, cut - position);
      if (head !== "") {
        piece.push({ ...run, text: head });
      }
      pieces.push(piece);
      piece = [];
      rest = rest.slice(cut - position);
      position = cut;
      pending.shift();
      cut = pending[0];
    }
    if (rest !== "") {
      piece.push({ ...run, text: rest });
    }
    position += rest.length;
  }
  pieces.push(piece);
  return pieces;
}

/** Where the question ending a piece starts, when a statement comes before it. */
function questionAfterStatement(piece: string): number | null {
  const start = QUESTION_STARTS.flatMap((pattern) =>
    [...piece.matchAll(pattern)].map((match) => match.index + match[0].length),
  )
    .sort((a, b) => a - b)
    .at(-1);
  if (start === undefined) {
    return null;
  }
  const statement = piece.slice(0, start);
  // "1. Qui peut… ?" is a numbered question, not a statement then a question.
  return /\p{L}/u.test(statement) && piece.length - start <= SHORT_HEADING_MAX_LENGTH
    ? start
    : null;
}

/**
 * Where to cut one line so each question stands alone: after a question followed
 * by its answer ("Où s'adresser ? À la mairie."), before a question following an
 * answer ("2 jours. Que faire en cas de perte ?"), after a heading phrase running
 * on into its content. List entries and remarks are left whole.
 */
function cutsInLine(line: string): number[] {
  const trimmed = line.trimStart();
  if (BULLET.test(trimmed) || NOTE.test(normalize(trimmed))) {
    return [];
  }
  const phrase = PHRASE_THEN_TEXT.exec(line);
  const answers = [...line.matchAll(QUESTION_END)].map((match) => match.index + match[0].length);
  const questions = [0, ...answers].flatMap((start, index) => {
    const piece = line.slice(start, answers[index] ?? line.length).trimEnd();
    const question = piece.endsWith("?") ? questionAfterStatement(piece) : null;
    return question === null ? [start] : [start, start + question];
  });
  return [...(phrase === null ? [] : [phrase[0].length]), ...questions]
    .filter((offset) => offset > 0)
    .sort((a, b) => a - b);
}

/** A paragraph cut into lines: one per line break, then each question on its own. */
function splitLines(block: Block): Block[] {
  if (block.type !== "paragraph") {
    return [block];
  }
  const text = block.inlines.map((run) => run.text).join("");
  const breaks = [...text.matchAll(/\n/g)].map((match) => match.index + 1);
  const cuts = [0, ...breaks].flatMap((start, index) => [
    start,
    ...cutsInLine(text.slice(start, breaks[index] ?? text.length)).map((cut) => start + cut),
  ]);
  return cutAt(
    block.inlines,
    cuts.filter((cut) => cut > 0),
  )
    .map(trimLine)
    .filter((inlines) => inlines.length > 0)
    .map((inlines): Block => ({ type: "paragraph", inlines }));
}

/**
 * A short line set entirely in bold, the source's other way of marking a heading
 * ("Pièces à fournir :", "Étapes"). Capitals only ("CAP", "NB") name, not title.
 */
function isBoldHeading(inlines: readonly Inline[], text: string): boolean {
  return (
    text.length > 0 &&
    text.length <= SHORT_HEADING_MAX_LENGTH &&
    !BULLET.test(text) &&
    !/[.;,!]$/.test(text) &&
    /\p{Ll}/u.test(text) &&
    inlines.every((run) => run.bold === true || run.text.trim() === "")
  );
}

/**
 * The title a block opens a section with, or null when the block is content. The
 * source's heading tags are not trusted (some sheets set every line as a heading):
 * a heading is a question, a known phrase, or a bold line naming a known subject
 * ("Frais de délivrance"). Other bold lines divide a section ("Pour les
 * étrangers :"), and a bold line right under a question is its answer.
 */
function headingOf(block: Block, answerExpected: boolean): string | null {
  if (block.type !== "heading" && block.type !== "paragraph") {
    return null;
  }
  const text = plainText(block.inlines);
  const boldSubject =
    !answerExpected && isBoldHeading(block.inlines, text) && kindOf(text) !== "info";
  return isQuestionHeading(text) || boldSubject ? text.replace(HEADING_NUMBER, "") : null;
}

function toItem(block: Block): SheetItem {
  if (block.type === "list") {
    return { type: "list", ordered: block.ordered, items: block.items };
  }
  // A heading too long to be one reads as the sentence it is.
  if (block.type !== "paragraph" && block.type !== "heading") {
    return { type: "block", block };
  }
  const note = withoutPrefix(block.inlines, NOTE);
  if (note !== null && note.length > 0) {
    return { type: "note", inlines: note };
  }
  return { type: "text", inlines: block.inlines };
}

/** Consecutive "•" paragraphs become one list. */
function mergeBullets(items: SheetItem[]): SheetItem[] {
  const merged: SheetItem[] = [];
  let open: Inline[][] | null = null;
  for (const item of items) {
    const entry = item.type === "text" ? withoutPrefix(item.inlines, BULLET) : null;
    if (entry?.length === 0) {
      // A lone "•" says nothing.
      continue;
    }
    if (entry === null) {
      open = null;
      merged.push(item);
    } else if (open === null) {
      open = [entry];
      merged.push({ type: "list", ordered: false, items: open });
    } else {
      open.push(entry);
    }
  }
  return merged;
}

/**
 * A lead-in ending with ":" followed by short lines ending with ";" (the last one
 * may end with ".") is a list written as paragraphs: it becomes a list.
 */
function mergeLeadInLists(items: SheetItem[]): SheetItem[] {
  const result: SheetItem[] = [];
  let index = 0;
  while (index < items.length) {
    const item = items[index];
    if (item === undefined) {
      break;
    }
    result.push(item);
    index += 1;
    if (item.type !== "text" || !plainText(item.inlines).endsWith(":")) {
      continue;
    }
    const entries: Inline[][] = [];
    while (index < items.length) {
      const next = items[index];
      const text = next?.type === "text" ? plainText(next.inlines) : "";
      if (next?.type !== "text" || text.length > LIST_ENTRY_MAX_LENGTH || text === "") {
        break;
      }
      entries.push(next.inlines);
      index += 1;
      if (!/[;,]$/.test(text)) {
        break;
      }
    }
    if (entries.length >= 2) {
      result.push({ type: "list", ordered: false, items: entries });
    } else {
      index -= entries.length;
    }
  }
  return result;
}

function tidy(items: SheetItem[]): SheetItem[] {
  return mergeLeadInLists(mergeBullets(items));
}

/** The procedure's text, organised into an introduction and titled sections. */
export function toProcedureSheet(blocks: readonly Block[]): ProcedureSheet {
  const opening: SheetItem[] = [];
  const found: SheetSection[] = [];
  for (const block of blocks.flatMap(splitLines)) {
    const title = headingOf(block, found.at(-1)?.items.length === 0);
    if (title !== null) {
      found.push({ title, kind: kindOf(title), items: [] });
      continue;
    }
    (found.at(-1)?.items ?? opening).push(toItem(block));
  }
  const intro = tidy(opening);
  const sections: SheetSection[] = [];
  for (const section of found) {
    const items = tidy(section.items);
    if (items.length > 0) {
      sections.push({ ...section, items });
    } else {
      // A question the source leaves unanswered stays, as a line of what precedes it.
      (sections.at(-1)?.items ?? intro).push({ type: "text", inlines: [{ text: section.title }] });
    }
  }
  return { intro, sections };
}
