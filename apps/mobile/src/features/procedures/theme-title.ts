import { en, fr, lookupMessage, wo } from "@bgs/i18n";
import type { Lang, ProcedureThemesResponse } from "@bgs/shared-types";

type Theme = ProcedureThemesResponse["themes"][number];

const CATALOGS: Record<Lang, object> = { fr, wo, en };

/**
 * A theme's title in the reader's language (ML-14): the interface's translation of
 * the official title, only while the source still writes it as the catalog does. A
 * theme renamed in the console shows its new French title, never an old translation.
 */
export function themeTitle(theme: Pick<Theme, "id" | "title">, lang: Lang): string {
  const key = `procedureThemes.${theme.id}`;
  const translated = lookupMessage(CATALOGS[lang], key);
  return lookupMessage(fr, key) === theme.title && typeof translated === "string"
    ? translated
    : theme.title;
}
