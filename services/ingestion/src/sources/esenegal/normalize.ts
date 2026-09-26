import { procedureSchema, type Procedure } from "@bgs/shared-types";
import sanitizeHtml from "sanitize-html";
import { QuarantineError } from "../../lib/errors";
import { contentHash, stableUuid } from "../../lib/identity";
import { hasOfficialMedia, sanitizeArticleHtml, textLength } from "../../lib/sanitize";
import type { ProcedureDetail } from "./api-schemas";

export const ESENEGAL_ORIGIN = "https://e-senegal.sn";

/** Public page of a procedure (checked in a browser, docs/sources.md). */
export function canonicalProcedureUrl(slug: string): string {
  return `${ESENEGAL_ORIGIN}/#/comprendre-ma-demarche/demarche/${encodeURIComponent(slug)}`;
}

/** Stable id of an e-senegal procedure (same procedure, same id, every run). */
export function esenegalProcedureId(sourceId: string): string {
  return stableUuid(`${ESENEGAL_ORIGIN}/demarche/${sourceId}`);
}

/** Below this, a text is an empty stand-in, not content ("Q", "R", "...", "D"). */
const MIN_MEANINGFUL_LENGTH = 3;
const MIN_BODY_LENGTH = 40;

/**
 * Plain text of a field, or null when the source left it empty or filled it with a
 * placeholder: those are never shown as if they were information.
 */
export function meaningful(value: string | null | undefined): string | null {
  const text = sanitizeHtml(value ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Placeholders seen at the source: dots or dashes ("...", "—"), one letter
  // repeated ("XXX", "QQQ"), or a single letter ("Q", "R", "D").
  const placeholder = /^[.\s…-]+$/.test(text) || /^(.)\1*$/iu.test(text);
  return text.length >= MIN_MEANINGFUL_LENGTH && !placeholder ? text : null;
}

function presentOnly<T>(values: (T | null)[]): T[] {
  return values.filter((value): value is T => value !== null);
}

function httpsUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function nonNegativeInt(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Turns one e-senegal.sn procedure into a validated, traceable Procedure. The main
 * text (steps) is the sanitized body; placeholders are dropped; an empty procedure
 * is quarantined, never published.
 */
export function normalizeProcedure(detail: ProcedureDetail, fetchedAt: string): Procedure {
  const sourceUrl = canonicalProcedureUrl(detail.slug);
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = detail.titre.trim();
  const bodyHtml =
    sanitizeArticleHtml(detail.corps ?? "") || sanitizeArticleHtml(detail.description ?? "");
  if (textLength(bodyHtml) < MIN_BODY_LENGTH && !hasOfficialMedia(bodyHtml)) {
    throw quarantine("procedure body is empty after sanitization");
  }

  const facts = {
    slug: detail.slug,
    summary: meaningful(detail.resume),
    costFcfa: nonNegativeInt(detail.cout),
    delayDays: nonNegativeInt(detail.delai),
    eligibility: meaningful(detail.qui_peut_faire_reponse),
    documents: presentOnly((detail.documents_a_fournir ?? []).map(meaningful)),
    online: detail.online === true,
    categories: presentOnly((detail.categories ?? []).map((c) => meaningful(c.title))),
    offices: presentOnly(
      (detail.service_administratifs ?? []).map((office) => {
        const name = meaningful(office.name);
        return name === null
          ? null
          : {
              name,
              acronym: meaningful(office.sigle),
              address: meaningful(office.adresse),
              town: meaningful(office.ville),
              region: meaningful(office.region),
              phone: meaningful(office.telephone),
              email: meaningful(office.email),
            };
      }),
    ),
    faqs: presentOnly(
      (detail.faqs ?? []).map((faq) => {
        const question = meaningful(faq.question);
        const answerHtml = sanitizeArticleHtml(faq.reponse ?? "");
        return question === null || meaningful(faq.reponse) === null
          ? null
          : { question, answerHtml };
      }),
    ),
    legalTexts: presentOnly(
      (detail.textes ?? []).map((legal) => {
        const name = meaningful(legal.name);
        return name === null ? null : { name, description: meaningful(legal.description) };
      }),
    ),
    usefulLinks: presentOnly(
      (detail.lien_utiles ?? []).map((link) => {
        const name = meaningful(link.name);
        const url = httpsUrl(link.url);
        return name === null || url === null ? null : { name, url };
      }),
    ),
    related: presentOnly(
      (detail.demarches ?? []).map((other) => {
        const slug = other.slug?.trim() ?? "";
        const otherTitle = meaningful(other.titre);
        return slug === "" || otherTitle === null ? null : { slug, title: otherTitle };
      }),
    ),
  };
  const translations: Procedure["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const publishedOn = detail.date_publication?.slice(0, 10) ?? null;

  const candidate = {
    id: esenegalProcedureId(detail.id),
    kind: "procedure" as const,
    sourceUrl,
    sourcePublishedOn:
      publishedOn !== null && /^\d{4}-\d{2}-\d{2}$/.test(publishedOn) ? publishedOn : null,
    sourceUpdatedAt: null,
    fetchedAt,
    contentHash: contentHash({ translations, facts }),
    version: 1,
    lang: "fr" as const,
    translations,
    audio: [],
    embedding: null,
    ...facts,
  };
  const result = procedureSchema.safeParse(candidate);
  if (!result.success) {
    throw quarantine(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}
