import { createTranslator, fr, resolveLang, wo, type FrCatalog, type Translate } from "@bgs/i18n";
import type { Lang } from "@bgs/shared-types";
import { getLocales } from "expo-localization";
import { createContext, useMemo, useState, type ReactNode } from "react";

export interface I18nContextValue {
  lang: Lang;
  t: Translate<FrCatalog>;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

const catalogs: Record<Lang, object> = { fr, wo };

function deviceLanguageTags(): string[] {
  return getLocales().map((locale) => locale.languageTag);
}

/** Language chosen at onboarding (kept in memory until local storage lands), else the phone's. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [chosenLang, setLang] = useState<Lang | null>(null);
  const lang = resolveLang(chosenLang, deviceLanguageTags());

  const value = useMemo(
    () => ({
      lang,
      t: createTranslator({ lang, reference: fr, catalog: catalogs[lang] }),
      setLang,
    }),
    [lang],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}
