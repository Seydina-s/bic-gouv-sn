import type { ArticleRepository } from "@bgs/content-store";
import type { NewsArticle, Translation } from "@bgs/shared-types";
import { z } from "zod";
import { articleContentHash } from "../merge";
import {
  BatchTranslation,
  type BatchTranslationOptions,
  type TranslatedKind,
} from "./batch-translation";
import { checkTranslation, readJsonReply } from "./translation-check";
import type { TranslationTarget } from "./targets";
import { articlesToTranslate } from "./wolof-candidates";
import { translationRequest } from "./wolof-prompt";

/*
 * Machine translation of articles (AI-13, ML-12): Wolof where the Présidence gave no
 * official Wolof version, English for every article. An official version collected
 * later replaces it (merge.ts).
 */

const PAGE_SIZE = 200;

/**
 * Room for the Wolof, never cut short: measured on the first run (08/10/2026), Wolof
 * takes about 0.9 token per French character (1.3 characters per token). Only the
 * tokens written are paid: the margin costs nothing.
 */
export function outputTokensFor(frenchCharacters: number, perCharacter = 1.2): number {
  return Math.min(
    MAX_OUTPUT_TOKENS,
    Math.max(2048, Math.ceil(frenchCharacters * perCharacter) + 1000),
  );
}

/** The model's own limit on a reply; the longest articles reach it in Wolof. */
const MAX_OUTPUT_TOKENS = 64_000;

/** Whether the translation of a text this long fits in one reply, with its room. */
export function fitsOneReply(frenchCharacters: number, perCharacter: number): boolean {
  return Math.ceil(frenchCharacters * perCharacter) + 1000 <= MAX_OUTPUT_TOKENS;
}

/** The blocks of a text, each closed: a paragraph, a heading, a list, a quote, a table. */
const BLOCK_END = /<\/(?:p|h[1-6]|ul|ol|blockquote|table|figure)>/gi;

/**
 * The text cut between blocks into parts that each fit in one reply, with a margin
 * (ML-12c): never inside a paragraph or a list.
 */
export function partsOf(bodyHtml: string, perCharacter: number): string[] {
  const limit = Math.floor(((MAX_OUTPUT_TOKENS - 1000) / perCharacter) * 0.8);
  const blocks: string[] = [];
  let start = 0;
  for (const match of bodyHtml.matchAll(BLOCK_END)) {
    const end = match.index + match[0].length;
    blocks.push(bodyHtml.slice(start, end));
    start = end;
  }
  if (start < bodyHtml.length) {
    blocks.push(bodyHtml.slice(start));
  }
  const parts: string[] = [];
  for (const block of blocks) {
    const last = parts.at(-1);
    if (last !== undefined && last.length + block.length <= limit) {
      parts[parts.length - 1] = last + block;
    } else {
      parts.push(block);
    }
  }
  return parts.filter((part) => part.trim() !== "");
}

const partReplySchema = z.object({ title: z.string(), bodyHtml: z.string() });

export async function allArticles(articles: ArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

/** The fingerprint of an article's official versions, whatever was machine-translated. */
export function officialFingerprint(article: NewsArticle): string {
  const official = article.translations.filter((translation) => translation.status !== "machine");
  return articleContentHash(official, article.sourcePublishedOn, article.category);
}

/** What is sent of an article, and what comes back. */
export type ArticleText = Pick<Translation, "title" | "bodyHtml">;

function articleKind(
  articles: ArticleRepository,
  target: TranslationTarget,
): TranslatedKind<NewsArticle, ArticleText, ArticleText> {
  return {
    all: () => allArticles(articles),
    get: (id) => articles.get(id),
    id: (article) => article.id,
    // The official versions only: a machine translation saved into one language
    // must not set aside the replies of another (17/10/2026: once the English was
    // saved, 2 562 Wolof replies were taken for articles changed meanwhile).
    version: officialFingerprint,
    // Runs sent before 17/10/2026 recorded the whole article's fingerprint.
    stillFits: (article, sent) =>
      sent === officialFingerprint(article) || sent === article.contentHash,
    french: (article) => {
      const french = target.toTranslate(article);
      return french === null ? null : { title: french.title, bodyHtml: french.bodyHtml };
    },
    // An article too long for one reply goes in parts (requests, below).
    waiting: (all, since) => articlesToTranslate(all, since, target.toTranslate),
    system: (all) => target.system(all),
    request: (french) => ({
      user: translationRequest(french),
      maxOutputTokens: outputTokensFor(french.bodyHtml.length, target.room),
    }),
    // Too long for one reply: in parts, each with the title, joined back after.
    requests: (french) =>
      fitsOneReply(french.bodyHtml.length, target.room)
        ? [
            {
              user: translationRequest(french),
              maxOutputTokens: outputTokensFor(french.bodyHtml.length, target.room),
            },
          ]
        : partsOf(french.bodyHtml, target.room).map((bodyHtml) => ({
            user: translationRequest({ title: french.title, bodyHtml }),
            maxOutputTokens: outputTokensFor(bodyHtml.length, target.room),
          })),
    mergeParts: (texts) => {
      const parts = texts.map((text) => readJsonReply(text, partReplySchema));
      const first = parts[0];
      if (first === undefined || first === null || parts.some((part) => part === null)) {
        return null;
      }
      return JSON.stringify({
        title: first.title,
        bodyHtml: parts.map((part) => part?.bodyHtml ?? "").join(""),
      });
    },
    check: (french, reply) => {
      const checked = checkTranslation(french, reply);
      return checked.ok
        ? { ok: true, value: { title: checked.title, bodyHtml: checked.bodyHtml } }
        : checked;
    },
    saveAll: async (translated) => {
      await articles.saveMany(
        translated.map(({ item: article, value: { title, bodyHtml } }) => {
          const translations = [
            ...article.translations,
            { lang: target.lang, status: "machine" as const, title, bodyHtml },
          ];
          return {
            ...article,
            translations,
            contentHash: articleContentHash(
              translations,
              article.sourcePublishedOn,
              article.category,
            ),
          };
        }),
      );
    },
    output: target.output,
  };
}

export interface ArticleTranslationOptions extends BatchTranslationOptions {
  articles: ArticleRepository;
  /** The language translated into, and what it takes. */
  target: TranslationTarget;
}

/** The articles' translation runs into one language. */
export class ArticleTranslation extends BatchTranslation<NewsArticle, ArticleText, ArticleText> {
  constructor({ articles, target, ...options }: ArticleTranslationOptions) {
    super(articleKind(articles, target), options);
  }
}
