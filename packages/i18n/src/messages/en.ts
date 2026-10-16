import type { PartialCatalog } from "../catalog";
import type { FrCatalog } from "./fr";

/**
 * English catalog (owner's decision of 16/10/2026: the whole app in the language
 * chosen, US spelling). Missing keys fall back to French and are listed by
 * findMissingMessages() so the gap stays visible.
 */
export const en: PartialCatalog<FrCatalog> = {};
