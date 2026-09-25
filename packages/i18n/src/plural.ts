import type { Lang } from "@bgs/shared-types";
import type { PluralMessage } from "./catalog";

export type PluralCategory = "one" | "many" | "other";

/**
 * CLDR plural rules for our two languages, written out because Intl.PluralRules
 * is not guaranteed on the mobile JS engine (Hermes).
 * - fr: "one" for 0 ≤ n < 2; "many" for exact millions (1 000 000 de…); else "other"
 * - wo: always "other"
 */
export function pluralCategory(lang: Lang, count: number): PluralCategory {
  if (lang === "wo") {
    return "other";
  }
  const absolute = Math.abs(count);
  if (absolute < 2) {
    return "one";
  }
  if (Number.isInteger(absolute) && absolute % 1_000_000 === 0) {
    return "many";
  }
  return "other";
}

export function selectPluralForm(message: PluralMessage, lang: Lang, count: number): string {
  const category = pluralCategory(lang, count);
  if (category === "one") {
    return message.one ?? message.other;
  }
  if (category === "many") {
    return message.many ?? message.other;
  }
  return message.other;
}
