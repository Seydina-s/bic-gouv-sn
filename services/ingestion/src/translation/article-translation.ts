import type { ArticleRepository } from "@bgs/content-store";
import type { NewsArticle, Translation } from "@bgs/shared-types";
import { articleContentHash } from "../merge";
import {
  BatchTranslation,
  type BatchTranslationOptions,
  type TranslatedKind,
} from "./batch-translation";
import { checkTranslation } from "./translation-check";
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
  return Math.min(32_000, Math.max(2048, Math.ceil(frenchCharacters * perCharacter) + 1000));
}

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
    version: (article) => article.contentHash,
    french: (article) => {
      const french = target.toTranslate(article);
      return french === null ? null : { title: french.title, bodyHtml: french.bodyHtml };
    },
    waiting: (all, since) => articlesToTranslate(all, since, target.toTranslate),
    system: (all) => target.system(all),
    request: (french) => ({
      user: translationRequest(french),
      maxOutputTokens: outputTokensFor(french.bodyHtml.length),
    }),
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
