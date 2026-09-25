import type { NewsSummary } from "@bgs/shared-types";

export const COUNCIL_CATEGORY = "conseil-des-ministres";

export type FrontPageRow =
  | { kind: "lead"; item: NewsSummary }
  | { kind: "council"; item: NewsSummary }
  | { kind: "story"; item: NewsSummary };

/**
 * Lays out "La Une": the newest story leads, the latest Conseil des ministres is
 * lifted into its own card right after it (unless it already leads), and every
 * other story follows in publication order. Each story appears exactly once.
 * `latestCouncil` comes from its own query, so the card shows even when the last
 * council is older than the loaded pages.
 */
export function composeFrontPage(
  items: readonly NewsSummary[],
  latestCouncil: NewsSummary | null = null,
): FrontPageRow[] {
  const [lead, ...rest] = items;
  if (lead === undefined) {
    return [];
  }
  const council =
    lead.category === COUNCIL_CATEGORY || latestCouncil?.id === lead.id
      ? undefined
      : (latestCouncil ?? rest.find((item) => item.category === COUNCIL_CATEGORY));
  return [
    { kind: "lead", item: lead },
    ...(council === undefined ? [] : [{ kind: "council" as const, item: council }]),
    ...rest
      .filter((item) => item.id !== council?.id)
      .map((item) => ({ kind: "story" as const, item })),
  ];
}
