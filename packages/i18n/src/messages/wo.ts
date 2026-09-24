import type { PartialCatalog } from "../catalog";
import type { FrCatalog } from "./fr";

/**
 * Wolof catalog. Intentionally empty: Wolof strings are written and validated by
 * native speakers, never invented. Missing keys fall back to French and are
 * listed by findMissingMessages() so the gap stays visible.
 */
export const wo: PartialCatalog<FrCatalog> = {};
