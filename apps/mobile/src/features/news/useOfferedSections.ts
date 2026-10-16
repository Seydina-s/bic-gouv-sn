import { panelSections, PANEL_SECTIONS } from "./category";
import { useFrontSections } from "./useNews";

/** Offered until the sections are known: every section but the one never published. */
const BEFORE_LOADING = PANEL_SECTIONS.filter((slug) => slug !== "agenda");

/**
 * The sections to offer, those that have articles, in the panel's order; `chosen`
 * ones always stay (an earlier choice is never hidden).
 */
export function useOfferedSections(chosen: readonly string[] = []): string[] {
  const front = useFrontSections();
  const present = front.data?.sections
    .filter((section) => section.total > 0)
    .map((section) => section.category);
  return panelSections([...(present ?? BEFORE_LOADING), ...chosen]);
}
