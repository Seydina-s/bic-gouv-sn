import type { ReactNode } from "react";
import { DataSaverProvider } from "../features/data-saver/DataSaverProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

/** What a screen part needs around it in tests: theme, language and data saving. */
export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DataSaverProvider>{children}</DataSaverProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
