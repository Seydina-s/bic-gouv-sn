import type { Lang } from "@bgs/shared-types";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useTranslation } from "./useTranslation";

export interface LanguageProps {
  /** Web: the HTML lang attribute (inherited by everything inside). */
  lang?: string;
  /** iOS: the voice VoiceOver reads this element with. */
  accessibilityLanguage?: string;
}

/**
 * Declares the language of a text that may differ from the interface's, such as a
 * Wolof article inside a French interface: screen readers then read it with the
 * right voice (WCAG 3.1.2, language of parts).
 */
export function languageProps(lang: Lang): LanguageProps {
  return Platform.OS === "web" ? { lang } : { accessibilityLanguage: lang };
}

/**
 * Web: the page declares the language its interface is really written in (the
 * export's template says "en"), so screen readers pick the right voice (WCAG 3.1.1).
 */
export function useDocumentLanguage(): void {
  const { interfaceLang } = useTranslation();
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.lang = interfaceLang;
    }
  }, [interfaceLang]);
}
