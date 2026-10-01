import type { SubscribersSummary } from "@bgs/shared-types";

/** Below this many new phones in 24 hours, no alert, whatever the pace before. */
export const GROWTH_FLOOR = 500;
/** How many times the usual daily pace counts as unusual. */
export const GROWTH_FACTOR = 5;

/**
 * The phones new in the last 24 hours and the usual daily pace (the week before),
 * when the first is far above the second: possibly fake subscriptions (AUD5-03),
 * since anyone can register a token. Null when the pace looks ordinary.
 */
export function unusualGrowth(
  summary: Pick<SubscribersSummary, "newLastDay" | "newWeekBefore">,
): { count: number; usual: number } | null {
  const usual = Math.round(summary.newWeekBefore / 7);
  const unusual = summary.newLastDay >= GROWTH_FLOOR && summary.newLastDay > GROWTH_FACTOR * usual;
  return unusual ? { count: summary.newLastDay, usual } : null;
}
