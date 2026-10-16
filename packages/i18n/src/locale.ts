import { langSchema, type Lang } from "@bgs/shared-types";
import { findMissingMessages, type MessageTree } from "./catalog";

/**
 * The language chosen at onboarding always wins. Before that, the first of the
 * app's languages (Wolof, French, English) the phone lists; French otherwise.
 */
export function resolveLang(chosen: Lang | null, deviceLanguageTags: readonly string[]): Lang {
  if (chosen !== null) {
    return chosen;
  }
  for (const tag of deviceLanguageTags) {
    const parsed = langSchema.safeParse(tag.toLowerCase().split(/[-_]/)[0]);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return "fr";
}

/**
 * The language the interface is really written in: while the chosen language's
 * catalog still misses words, they come from French, so the interface is French.
 * Declared to screen readers, so they read it with the right voice (WCAG 3.1.1).
 */
export function interfaceLanguage(lang: Lang, reference: MessageTree, catalog: object): Lang {
  return lang === "fr" || findMissingMessages(reference, catalog).length > 0 ? "fr" : lang;
}
