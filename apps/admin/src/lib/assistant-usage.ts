import type { AssistantUsage } from "@bgs/shared-types";

/** Claude Haiku 4.5, in dollars per million tokens (Anthropic's price list, 03/10/2026). */
const PRICE_PER_MILLION = { input: 1, output: 5 } as const;
/** From this share of the month's questions, the console's first screen says so. */
export const NEAR_LIMIT_SHARE = 0.8;

/** What this month's questions cost, at the assistant model's price. */
export function estimatedCost(usage: Pick<AssistantUsage, "inputTokens" | "outputTokens">): number {
  return (
    (usage.inputTokens * PRICE_PER_MILLION.input + usage.outputTokens * PRICE_PER_MILLION.output) /
    1_000_000
  );
}

/** Average cost of one question this month; null before the first one. */
export function averageCost(usage: AssistantUsage): number | null {
  return usage.questions === 0 ? null : estimatedCost(usage) / usage.questions;
}

/** Share of the monthly limit used, from 0 to 1. */
export function usedShare(usage: Pick<AssistantUsage, "questions" | "monthlyLimit">): number {
  return Math.min(1, usage.questions / usage.monthlyLimit);
}

const dollars = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const cents = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 2,
});

/** "12,40 $", or "0,0031 $" for a fraction of a cent. */
export function formatDollars(amount: number): string {
  return amount !== 0 && amount < 0.01 ? cents.format(amount) : dollars.format(amount);
}
