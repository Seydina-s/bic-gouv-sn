import { use } from "react";
import { I18nContext, type I18nContextValue } from "./I18nProvider";

export function useTranslation(): I18nContextValue {
  const context = use(I18nContext);
  if (context === null) {
    throw new Error("useTranslation must be used inside <I18nProvider>");
  }
  return context;
}
