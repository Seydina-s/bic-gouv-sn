import { createTranslator, fr, resolveLang, wo, type FrCatalog, type Translate } from "@bgs/i18n";
import type { Lang } from "@bgs/shared-types";
import { getLocales } from "expo-localization";
import { createContext, useMemo, type ReactNode } from "react";
import { usePersistentChoice } from "../data/usePersistentChoice";

export interface I18nContextValue {
  lang: Lang;
  t: Translate<FrCatalog>;
  /** Language chosen in the settings, or "auto" to follow the phone. */
  choice: LangChoice;
  setLang: (choice: LangChoice) => void;
}

export type LangChoice = Lang | "auto";
const CHOICES: readonly LangChoice[] = ["auto", "fr", "wo"];

export const I18nContext = createContext<I18nContextValue | null>(null);

const catalogs: Record<Lang, object> = { fr, wo };

function deviceLanguageTags(): string[] {
  return getLocales().map((locale) => locale.languageTag);
}

/** Language chosen in the settings (remembered on the phone), else the phone's. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [choice, setLang] = usePersistentChoice("bgs-language", CHOICES, "auto");
  const lang = resolveLang(choice === "auto" ? null : choice, deviceLanguageTags());

  const value = useMemo(
    () => ({
      lang,
      t: createTranslator({ lang, reference: fr, catalog: catalogs[lang] }),
      choice,
      setLang,
    }),
    [lang, choice, setLang],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}
