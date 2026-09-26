import type { NewsSummary } from "@bgs/shared-types";
import { SECTION_FILTERS } from "./category";

export const COUNCIL_CATEGORY = "conseil-des-ministres";

/** Stories taking turns in the front page carousel. */
export const HERO_SIZE = 5;

/**
 * Stories for the carousel: the newest ones that have a photo (a carousel without
 * pictures reads as a wall of text). Falls back to the newest story alone.
 */
export function heroStories(items: readonly NewsSummary[], size = HERO_SIZE): NewsSummary[] {
  const pictured = items.filter((item) => item.cover !== null).slice(0, size);
  if (pictured.length > 0) {
    return pictured;
  }
  return items.slice(0, 1);
}

/**
 * Front page rows in the order of the official site's sections; sections this
 * version does not know come after, empty sections are left out.
 */
export function orderSections<T extends { category: string; items: readonly unknown[] }>(
  sections: readonly T[],
): T[] {
  const rank = (category: string) => {
    const index = (SECTION_FILTERS as readonly string[]).indexOf(category);
    return index === -1 ? SECTION_FILTERS.length : index;
  };
  return sections
    .filter((section) => section.items.length > 0)
    .map((section, position) => ({ section, position }))
    .sort((a, b) => rank(a.section.category) - rank(b.section.category) || a.position - b.position)
    .map(({ section }) => section);
}
