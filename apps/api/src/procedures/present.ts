import {
  currentSheet,
  SHEET_LANGS,
  type Lang,
  type LocalizedSheet,
  type Procedure,
  type ProcedureDetail,
  type ProcedureSummary,
  type SheetLang,
} from "@bgs/shared-types";
import { htmlToBlocks } from "../news/html-to-blocks";

function frenchVersion(procedure: Procedure) {
  // Procedures exist in French at the source; other languages are machine translations.
  return procedure.translations.find((translation) => translation.lang === "fr");
}

function isSheetLang(lang: Lang): lang is SheetLang {
  return (SHEET_LANGS as readonly string[]).includes(lang);
}

/**
 * The translation of the sheet in `lang` for its current French version, when the
 * caller accepts other languages (the app asks `fallback=fr` since ML-14); null to
 * show the French. An app that does not ask gets the French, as before.
 */
function sheetIn(procedure: Procedure, lang: Lang, fallback: Lang | null): LocalizedSheet | null {
  return fallback === null || !isSheetLang(lang) ? null : currentSheet(procedure, lang);
}

export function toProcedureSummary(
  procedure: Procedure,
  lang: Lang = "fr",
  fallback: Lang | null = null,
): ProcedureSummary | null {
  const translation = frenchVersion(procedure);
  if (translation === undefined) {
    return null;
  }
  const sheet = sheetIn(procedure, lang, fallback);
  return {
    id: procedure.id,
    slug: procedure.slug,
    title: sheet?.title ?? translation.title,
    summary: sheet === null ? procedure.summary : sheet.summary,
    costFcfa: procedure.costFcfa,
    delayDays: procedure.delayDays,
    online: procedure.online,
    lang: sheet === null ? "fr" : lang,
  };
}

export function toProcedureDetail(
  procedure: Procedure,
  lang: Lang = "fr",
  fallback: Lang | null = null,
): ProcedureDetail | null {
  const summary = toProcedureSummary(procedure, lang, fallback);
  const translation = frenchVersion(procedure);
  if (summary === null || translation === undefined) {
    return null;
  }
  const sheet = sheetIn(procedure, lang, fallback);
  const faqs = sheet?.faqs ?? procedure.faqs;
  return {
    ...summary,
    translationStatus: sheet?.status ?? translation.status,
    blocks: htmlToBlocks(sheet?.bodyHtml ?? translation.bodyHtml),
    eligibility: sheet === null ? procedure.eligibility : sheet.eligibility,
    documents: sheet?.documents ?? procedure.documents,
    offices: procedure.offices,
    faqs: faqs.map(({ question, answerHtml }) => ({
      question,
      blocks: htmlToBlocks(answerHtml),
    })),
    legalTexts: procedure.legalTexts,
    usefulLinks: procedure.usefulLinks,
    related: procedure.related,
    sourceUrl: translation.sourceUrl ?? procedure.sourceUrl,
    fetchedAt: procedure.fetchedAt,
    version: procedure.version,
  };
}
