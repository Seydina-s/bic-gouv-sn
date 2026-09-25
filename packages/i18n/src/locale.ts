import type { Lang } from "@bgs/shared-types";

/**
 * The language chosen at onboarding always wins. Before that, Wolof is used if
 * the phone lists it first among Wolof/French; French otherwise.
 */
export function resolveLang(chosen: Lang | null, deviceLanguageTags: readonly string[]): Lang {
  if (chosen !== null) {
    return chosen;
  }
  for (const tag of deviceLanguageTags) {
    const language = tag.toLowerCase().split(/[-_]/)[0];
    if (language === "wo" || language === "fr") {
      return language;
    }
  }
  return "fr";
}
