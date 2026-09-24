import { t } from "../lib/i18n";

/** Product identity: the flag's three bands as a hairline, then the name. */
export function AppHeader() {
  return (
    <header className="border-b border-line">
      <div aria-hidden="true" className="flex h-1">
        <span className="flex-1 bg-flag-green" />
        <span className="flex-1 bg-flag-yellow" />
        <span className="flex-1 bg-flag-red" />
      </div>
      <div className="mx-auto flex w-full max-w-5xl items-baseline gap-3 px-6 py-5 md:px-10">
        <span className="font-display text-xl font-extrabold tracking-tight text-brand">
          {t("shell.productName")}
        </span>
        <span className="text-sm font-semibold text-ink-soft">{t("shell.area")}</span>
      </div>
    </header>
  );
}
