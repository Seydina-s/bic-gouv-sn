import type { Procedure, ProcedureDetail, ProcedureSummary } from "@bgs/shared-types";
import { htmlToBlocks } from "../news/html-to-blocks";

function frenchVersion(procedure: Procedure) {
  // Procedures exist in French at the source; Wolof comes later as labelled translation.
  return procedure.translations.find((translation) => translation.lang === "fr");
}

export function toProcedureSummary(procedure: Procedure): ProcedureSummary | null {
  const translation = frenchVersion(procedure);
  if (translation === undefined) {
    return null;
  }
  return {
    id: procedure.id,
    slug: procedure.slug,
    title: translation.title,
    summary: procedure.summary,
    costFcfa: procedure.costFcfa,
    delayDays: procedure.delayDays,
    online: procedure.online,
  };
}

export function toProcedureDetail(procedure: Procedure): ProcedureDetail | null {
  const summary = toProcedureSummary(procedure);
  const translation = frenchVersion(procedure);
  if (summary === null || translation === undefined) {
    return null;
  }
  return {
    ...summary,
    translationStatus: translation.status,
    blocks: htmlToBlocks(translation.bodyHtml),
    eligibility: procedure.eligibility,
    documents: procedure.documents,
    offices: procedure.offices,
    faqs: procedure.faqs.map(({ question, answerHtml }) => ({
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
