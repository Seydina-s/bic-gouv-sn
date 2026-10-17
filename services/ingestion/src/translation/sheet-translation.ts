import type { ProcedureRepository } from "@bgs/content-store";
import { currentSheet, type NewsArticle, type Procedure } from "@bgs/shared-types";
import { z } from "zod";
import { textLength } from "../lib/sanitize";
import { meaningful } from "../sources/esenegal/normalize";
import { outputTokensFor } from "./article-translation";
import {
  BatchTranslation,
  type BatchTranslationOptions,
  type Checked,
  type TranslatedKind,
} from "./batch-translation";
import { checkHtml, lengthOff, readJsonReply } from "./translation-check";
import type { TranslationTarget } from "./targets";

/*
 * Machine translation of the procedure sheets of e-senegal.sn (ML-14): the whole
 * sheet (title, steps, summary, who, documents, questions) in one request, kept apart
 * from the French and valid for its French version only. The app shows it labelled
 * "traduction automatique"; once the source changes the sheet, the French is shown
 * until the next run translates it again.
 */

/** Room for a sheet's translation, in tokens per character of the request. */
export const SHEET_TOKENS_PER_CHARACTER = 2;

/** What is sent of a sheet, and what comes back: the same keys. */
export interface SheetText {
  title: string;
  bodyHtml: string;
  summary: string | null;
  eligibility: string | null;
  documents: string[];
  faqs: { question: string; answerHtml: string }[];
}

/** The French sheet, as the source published it. */
export function frenchSheet(procedure: Procedure): SheetText | null {
  const french = procedure.translations.find((translation) => translation.lang === "fr");
  return french === undefined
    ? null
    : {
        title: french.title,
        bodyHtml: french.bodyHtml,
        summary: procedure.summary,
        eligibility: procedure.eligibility,
        documents: [...procedure.documents],
        faqs: procedure.faqs.map(({ question, answerHtml }) => ({ question, answerHtml })),
      };
}

/** The sheet to translate, as data. */
export function sheetRequest(french: SheetText): string {
  return `<sheet>${JSON.stringify(french)}</sheet>`;
}

const replySchema = z.object({
  title: z.string().trim().min(1).max(500),
  bodyHtml: z.string(),
  summary: z.string().nullable(),
  eligibility: z.string().nullable(),
  documents: z.array(z.string()),
  faqs: z.array(z.object({ question: z.string(), answerHtml: z.string() })),
});

/** The same plain field translated, cleaned like the source's; null when it is gone. */
function plainField(french: string | null, translated: string | null): string | null | undefined {
  if (french === null) {
    return translated === null ? null : undefined;
  }
  return meaningful(translated) ?? undefined;
}

/**
 * The model's reply for `french`, or why it is refused: readable, the same fields
 * filled (a null stays null, every list keeps its items), each text with its French
 * one's blocks and images, and about as long as the French on the whole.
 */
export function checkSheet(french: SheetText, reply: string): Checked<SheetText> {
  const parsed = readJsonReply(reply, replySchema);
  if (parsed === null) {
    return { ok: false, refusal: "unreadable" };
  }
  const summary = plainField(french.summary, parsed.summary);
  const eligibility = plainField(french.eligibility, parsed.eligibility);
  const documents = parsed.documents.map((document) => meaningful(document));
  const questions = parsed.faqs.map((faq) => meaningful(faq.question));
  if (
    summary === undefined ||
    eligibility === undefined ||
    documents.length !== french.documents.length ||
    parsed.faqs.length !== french.faqs.length
  ) {
    return { ok: false, refusal: "structure_changed" };
  }
  if (documents.includes(null) || questions.includes(null)) {
    return { ok: false, refusal: "empty" };
  }
  const body = checkHtml(french.bodyHtml, parsed.bodyHtml);
  if (!body.ok) {
    return body;
  }
  const answers = [];
  for (const [index, faq] of parsed.faqs.entries()) {
    const answer = checkHtml(french.faqs[index]?.answerHtml ?? "", faq.answerHtml);
    if (!answer.ok) {
      return answer;
    }
    answers.push(answer.html);
  }
  const value: SheetText = {
    title: parsed.title,
    bodyHtml: body.html,
    summary,
    eligibility,
    documents: documents.filter((document) => document !== null),
    faqs: answers.map((answerHtml, index) => ({
      question: questions[index] ?? "",
      answerHtml,
    })),
  };
  if (lengthOff(sheetLength(french), sheetLength(value))) {
    return { ok: false, refusal: "length_off" };
  }
  return { ok: true, value };
}

/** Characters of text a reader sees on the sheet. */
function sheetLength(sheet: SheetText): number {
  return (
    textLength(sheet.bodyHtml) +
    (sheet.summary?.length ?? 0) +
    (sheet.eligibility?.length ?? 0) +
    sheet.documents.reduce((sum, document) => sum + document.length, 0) +
    sheet.faqs.reduce((sum, faq) => sum + faq.question.length + textLength(faq.answerHtml), 0)
  );
}

function sheetKind(
  procedures: ProcedureRepository,
  target: TranslationTarget,
  articles: readonly NewsArticle[],
): TranslatedKind<Procedure, SheetText, SheetText> {
  const lang = target.lang;
  const french = (procedure: Procedure) =>
    currentSheet(procedure, lang) === null ? frenchSheet(procedure) : null;
  return {
    all: () => procedures.all(),
    get: (id) => procedures.get(id),
    id: (procedure) => procedure.id,
    version: (procedure) => procedure.contentHash,
    french,
    // Procedures have no publication date: every sheet waits, in alphabetical order.
    waiting: (all) => all.filter((procedure) => french(procedure) !== null),
    system: () => target.sheetSystem(articles),
    request: (sheet) => {
      const user = sheetRequest(sheet);
      // A sheet full of links took 1.7 tokens a character in Wolof and was cut short
      // (trial of 17/10/2026): twice its length, the margin costing nothing.
      return { user, maxOutputTokens: outputTokensFor(user.length, SHEET_TOKENS_PER_CHARACTER) };
    },
    check: checkSheet,
    // The procedures' file is small: one write per sheet is enough.
    saveAll: async (translated) => {
      for (const { item: procedure, value: sheet } of translated) {
        await procedures.setLocalized(procedure.id, lang, {
          status: "machine",
          forHash: procedure.contentHash,
          ...sheet,
        });
      }
    },
    output: target.output,
  };
}

export interface SheetTranslationOptions extends BatchTranslationOptions {
  procedures: ProcedureRepository;
  target: TranslationTarget;
  /** The articles, whose official Wolof pairs show the model today's Wolof. */
  articles: readonly NewsArticle[];
}

/** The procedure sheets' translation runs into one language. */
export class SheetTranslation extends BatchTranslation<Procedure, SheetText, SheetText> {
  constructor({ procedures, target, articles, ...options }: SheetTranslationOptions) {
    super(sheetKind(procedures, target, articles), options);
  }
}

/** How many of the optional fields a sheet fills (summary, who, documents, questions). */
function richness(procedure: Procedure): number {
  return [
    procedure.summary !== null,
    procedure.eligibility !== null,
    procedure.documents.length > 0,
    procedure.faqs.length > 0,
  ].filter(Boolean).length;
}

/**
 * Sheets for a trial: the richest first, so that as many fields as possible are
 * tried. Few sheets fill them all (17/10/2026: of 718, 6 list their documents and
 * none has questions): requiring every field left the trial empty.
 */
export function sheetTrialPicks(procedures: readonly Procedure[], count: number): Procedure[] {
  return [...procedures].sort((a, b) => richness(b) - richness(a)).slice(0, count);
}
