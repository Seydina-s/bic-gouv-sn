import { newsArticleSchema, type Lang, type NewsArticle } from "@bgs/shared-types";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { articleContentHash } from "../../merge";
import { sanitizeArticleHtml, textLength } from "../../lib/sanitize";
import type { DetailResponse } from "./api-schemas";

export const SITE_ORIGIN = "https://www.presidence.sn";

/** Canonical public page of an article (the site redirects URLs without the final slash). */
export function canonicalArticleUrl(lang: Lang, slug: string): string {
  return `${SITE_ORIGIN}/${lang}/actualites/${encodeURIComponent(slug)}/`;
}

/** The source serves media URLs with a doubled slash ("…sn//storage/…"): normalized. */
export function normalizeMediaUrl(url: string): string {
  return url.replace(/([^:])\/{2,}/g, "$1/");
}

/** Stable id of a presidence.sn article, shared by its French and Wolof versions. */
export function presidenceArticleId(sourceArticleId: number): string {
  return stableUuid(`${SITE_ORIGIN}/article/${String(sourceArticleId)}`);
}

/** Below this, an article is considered emptied (by the source or by sanitization). */
const MIN_TEXT_LENGTH = 40;

export interface NormalizeContext {
  lang: Lang;
  fetchedAt: string;
}

/**
 * Turns one presidence.sn API detail into a validated NewsArticle, identical to the
 * source in its words. Images and PDF attachments are processed by a later pipeline
 * step (download, variants, hashes), so they are not attached here yet.
 */
export function normalizeDetail(detail: DetailResponse, { lang, fetchedAt }: NormalizeContext) {
  const version = detail.data.article;
  const base = version.article;
  const sourceUrl = canonicalArticleUrl(lang, version.slug);
  const category = detail.data.categories.find((entry) => entry.id === base.categorieId);
  const title = version.titre.trim();
  const bodyHtml = sanitizeArticleHtml(version.content);

  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  if (base.published !== 1 || base.deleted_at !== null) {
    throw quarantine("article is not published at the source");
  }
  if (category === undefined) {
    throw quarantine(`unknown category id ${String(base.categorieId)}`);
  }
  if (textLength(bodyHtml) < MIN_TEXT_LENGTH) {
    throw quarantine("article body is empty after sanitization");
  }

  const translations: NewsArticle["translations"] = [
    { lang, status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: presidenceArticleId(version.articleId),
    kind: "news-article",
    category: category.reference,
    sourceUrl,
    sourcePublishedOn: base.date,
    sourceUpdatedAt: version.updated_at,
    fetchedAt,
    contentHash: articleContentHash(translations, base.date, category.reference),
    version: 1,
    lang,
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };

  const result = newsArticleSchema.safeParse(candidate);
  if (!result.success) {
    throw quarantine(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}
