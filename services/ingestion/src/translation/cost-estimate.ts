import type { NewsArticle } from "@bgs/shared-types";
import { frenchToTranslate, type OfficialPair } from "./wolof-candidates";
import { translationSystem } from "./wolof-prompt";

/*
 * What translating would cost, before anything is sent (owner's rule: every paid
 * use is costed and approved first). Prudent: the cached rules are counted at full
 * price; the real figure comes from the collection's report.
 */

/** Dollars per million tokens, batch price (half the list price; list of 03/10/2026). */
export const BATCH_PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5-20251001": { input: 0.5, output: 2.5 },
};

/** Characters per token: French reads densely; Wolof, rarer, measured at 1.3 (08/10/2026). */
const FRENCH_CHARACTERS_PER_TOKEN = 3.5;
const WOLOF_CHARACTERS_PER_TOKEN = 1.3;
/** Wolof runs a little longer than the French it translates. */
const WOLOF_LENGTH = 1.15;

export interface CostEstimate {
  articles: number;
  frenchCharacters: number;
  inputTokens: number;
  outputTokens: number;
  /** Per model; null when its price is not known here. */
  dollars: Record<string, number | null>;
}

export function estimateCost(
  articles: readonly NewsArticle[],
  pairs: readonly OfficialPair[],
  models: readonly string[],
): CostEstimate {
  const systemTokens = translationSystem(pairs).length / FRENCH_CHARACTERS_PER_TOKEN;
  const frenchCharacters = articles.reduce((sum, article) => {
    const french = frenchToTranslate(article);
    return sum + (french === null ? 0 : french.title.length + french.bodyHtml.length);
  }, 0);
  const inputTokens = Math.ceil(
    articles.length * systemTokens + frenchCharacters / FRENCH_CHARACTERS_PER_TOKEN,
  );
  const outputTokens = Math.ceil((frenchCharacters * WOLOF_LENGTH) / WOLOF_CHARACTERS_PER_TOKEN);
  const dollars = Object.fromEntries(
    models.map((model) => {
      const price = BATCH_PRICES[model];
      return [
        model,
        price === undefined
          ? null
          : (inputTokens * price.input + outputTokens * price.output) / 1_000_000,
      ];
    }),
  );
  return { articles: articles.length, frenchCharacters, inputTokens, outputTokens, dollars };
}
