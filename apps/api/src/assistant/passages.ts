import { createTranslator, fr } from "@bgs/i18n";
import type { Block, Lang, NewsArticle, Procedure, Translation } from "@bgs/shared-types";
import { htmlToBlocks } from "../news/html-to-blocks";

/*
 * The official base cut into passages for the assistant (P2, RAG): a few paragraphs
 * of one language version each, traceable to the source (link and date). Only what
 * the source published is kept: no machine translation, no withdrawn version,
 * nothing rewritten. An answer may only quote these passages.
 */

export interface Passage {
  /** Content, language and position: stable while the content does not change. */
  id: string;
  contentId: string;
  kind: "news-article" | "procedure";
  lang: Lang;
  /** "official", or "reviewed" for a machine translation checked by a person. */
  status: Translation["status"];
  title: string;
  sourceUrl: string;
  publishedOn: string | null;
  /** Version of the content the passage was cut from: cut again when it changes. */
  contentHash: string;
  /** The article's section ("conseil-des-ministres"…); none for a procedure. */
  section?: string;
  text: string;
}

/** Passages grow to about TARGET characters (200 to 350 tokens), never past MAX. */
const TARGET_LENGTH = 900;
const MAX_LENGTH = 1400;

/** Labels of the procedure facts, as the app shows them (French: e-senegal.sn). */
const t = createTranslator({ lang: "fr", reference: fr, catalog: fr });

/**
 * Joins pieces in order while the current passage is under `target`, without going
 * past `max`. A piece longer than `max` stays whole: cut it before.
 */
function pack(pieces: string[], separator: string, target: number, max: number): string[] {
  const packed: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const fits = current.length < target && current.length + separator.length + piece.length <= max;
    if (current === "" || fits) {
      current = current === "" ? piece : `${current}${separator}${piece}`;
    } else {
      packed.push(current);
      current = piece;
    }
  }
  return current === "" ? packed : [...packed, current];
}

function packUpToMax(pieces: string[]): string[] {
  return pack(pieces, " ", MAX_LENGTH, MAX_LENGTH);
}

/** A paragraph longer than a passage, cut between sentences, then between words. */
function splitLong(paragraph: string): string[] {
  if (paragraph.length <= MAX_LENGTH) {
    return [paragraph];
  }
  const sentences = paragraph
    .split(/(?<=[.!?…])\s+/u)
    .flatMap((sentence) =>
      sentence.length <= MAX_LENGTH ? [sentence] : packUpToMax(sentence.split(/\s+/u)),
    );
  return packUpToMax(sentences);
}

function inlineText(inlines: readonly { text: string }[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/[^\S\n]+/gu, " ")
    .trim();
}

function blockText(block: Block): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return inlineText(block.inlines);
    case "list":
      return block.items.map((item) => `- ${inlineText(item)}`).join("\n");
    case "image":
    case "video":
      return "";
  }
}

/** Readable text of a sanitized body, one entry per paragraph, heading or list. */
export function paragraphsOf(html: string): string[] {
  return htmlToBlocks(html)
    .map(blockText)
    .filter((text) => text !== "");
}

function isQuotable(translation: Translation): boolean {
  return translation.withdrawnAt === undefined && translation.status !== "machine";
}

type Content = Pick<
  NewsArticle | Procedure,
  "id" | "kind" | "sourceUrl" | "sourcePublishedOn" | "contentHash"
>;

function cut(content: Content, translation: Translation, sections: string[]): Passage[] {
  const texts = pack(sections.flatMap(splitLong), "\n\n", TARGET_LENGTH, MAX_LENGTH);
  return texts.map((text, index) => ({
    id: `${content.id}:${translation.lang}:${String(index)}`,
    contentId: content.id,
    kind: content.kind,
    lang: translation.lang,
    status: translation.status,
    title: translation.title,
    sourceUrl: translation.sourceUrl ?? content.sourceUrl,
    publishedOn: content.sourcePublishedOn,
    contentHash: content.contentHash,
    text,
  }));
}

export function articlePassages(article: NewsArticle): Passage[] {
  return article.translations
    .filter(isQuotable)
    .flatMap((translation) => cut(article, translation, paragraphsOf(translation.bodyHtml)))
    .map((passage) => ({ ...passage, section: article.category }));
}

function listed(label: string, items: string[]): string[] {
  return items.length === 0 ? [] : [[label, ...items.map((item) => `- ${item}`)].join("\n")];
}

/** The facts the procedure sheet shows, written as the sheet labels them. */
function procedureFacts(procedure: Procedure): string[] {
  const facts: string[] = [];
  if (procedure.summary !== null) {
    facts.push(procedure.summary);
  }
  if (procedure.eligibility !== null) {
    facts.push(`${t("procedures.eligibility")}\n${procedure.eligibility}`);
  }
  facts.push(...listed(t("procedures.documents"), procedure.documents));
  if (procedure.costFcfa !== null) {
    const cost =
      procedure.costFcfa === 0 ? t("procedures.free") : `${String(procedure.costFcfa)} F CFA`;
    facts.push(`${t("procedures.cost")} : ${cost}`);
  }
  if (procedure.delayDays !== null) {
    facts.push(
      `${t("procedures.delay")} : ${t("procedures.delayDays", { count: procedure.delayDays })}`,
    );
  }
  if (procedure.online) {
    facts.push(t("procedures.onlineYes"));
  }
  const offices = procedure.offices.map((office) =>
    [office.name, office.address, office.town].filter((part) => part !== null).join(", "),
  );
  facts.push(...listed(t("procedures.offices"), offices));
  return facts;
}

function faqSections(procedure: Procedure): string[] {
  return procedure.faqs.map(({ question, answerHtml }) =>
    [question, ...paragraphsOf(answerHtml)].join("\n"),
  );
}

/** The sheet's facts and questions are in French, the language of e-senegal.sn. */
export function procedurePassages(procedure: Procedure): Passage[] {
  return procedure.translations.filter(isQuotable).flatMap((translation) => {
    const extra =
      translation.lang === "fr" ? [...procedureFacts(procedure), ...faqSections(procedure)] : [];
    return cut(procedure, translation, [...paragraphsOf(translation.bodyHtml), ...extra]);
  });
}
