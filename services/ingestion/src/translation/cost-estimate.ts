/*
 * What translating would cost, before anything is sent (owner's rule: every paid
 * use is costed and approved first). Prudent: the cached rules are counted at full
 * price; the real figure comes from the collection's report.
 */

/** Dollars per million tokens, batch price (half the list price; list of 03/10/2026). */
export const BATCH_PRICES: Record<string, { input: number; output: number }> = {
  // Chosen for Wolof and English by the owner on 16/10/2026 (list price 2 $ / 10 $).
  "claude-sonnet-5-5": { input: 1, output: 5 },
  "claude-opus-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5-20251001": { input: 0.5, output: 2.5 },
};

/** Characters per token of the French read (each language gives its own output's). */
const FRENCH_CHARACTERS_PER_TOKEN = 3.5;
/**
 * Measured gap between this model and the bill: the batch of 351 articles sent on
 * 09/10/2026 was estimated at 14.45 $ and cost 18.83 $. Applied to every figure, so
 * an estimate shown to the owner is no longer below what will be paid.
 */
export const MEASURED_OVERRUN = 1.3;

/** How a language's translation is written: characters per token, length against French. */
export interface OutputSize {
  charactersPerToken: number;
  lengthRatio: number;
}

export interface CostEstimate {
  items: number;
  frenchCharacters: number;
  inputTokens: number;
  outputTokens: number;
  /** Per model; null when its price is not known here. */
  dollars: Record<string, number | null>;
}

/** The cost of translating items of these sizes (French characters sent, each). */
export function estimateCost(
  sizes: readonly number[],
  system: string,
  output: OutputSize,
  models: readonly string[],
): CostEstimate {
  const systemTokens = system.length / FRENCH_CHARACTERS_PER_TOKEN;
  const frenchCharacters = sizes.reduce((sum, size) => sum + size, 0);
  const inputTokens = Math.ceil(
    sizes.length * systemTokens + frenchCharacters / FRENCH_CHARACTERS_PER_TOKEN,
  );
  const outputTokens = Math.ceil((frenchCharacters * output.lengthRatio) / output.charactersPerToken);
  const dollars = Object.fromEntries(
    models.map((model) => {
      const price = BATCH_PRICES[model];
      return [
        model,
        price === undefined
          ? null
          : ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) *
            MEASURED_OVERRUN,
      ];
    }),
  );
  return { items: sizes.length, frenchCharacters, inputTokens, outputTokens, dollars };
}
