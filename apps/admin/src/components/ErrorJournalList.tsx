import { InfoIcon, WarningIcon, WarningOctagonIcon } from "@phosphor-icons/react/dist/ssr";
import type { ErrorSeverity } from "@bgs/shared-types";
import type { JournalRow } from "../lib/error-journal";
import { formatClockTime, formatDay } from "../lib/format";
import { t } from "../lib/i18n";

/** Red, yellow, green: always with an icon and a word, never the colour alone. */
const SEVERITY_LOOK: Record<ErrorSeverity, { box: string; Icon: typeof InfoIcon }> = {
  critical: { box: "bg-danger-surface text-on-danger-surface", Icon: WarningOctagonIcon },
  warning: { box: "bg-accent-container text-on-accent-container", Icon: WarningIcon },
  info: { box: "bg-primary-container text-on-primary-container", Icon: InfoIcon },
};

function when(key: "errors.since" | "errors.last", date: Date): string {
  return t(key, { day: formatDay(date), time: formatClockTime(date) });
}

function ErrorCard({ row }: { row: JournalRow }) {
  const { explanation } = row;
  const { box, Icon } = SEVERITY_LOOK[explanation.severity];
  return (
    <li className="rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-sm font-semibold ${box}`}
        >
          <Icon aria-hidden="true" weight="fill" className="size-4" />
          {t(`errors.severity.${explanation.severity}`)}
        </span>
        <span className="text-sm font-semibold text-ink-soft">
          {row.ongoing ? t("errors.ongoing") : t("errors.ended")} ·{" "}
          {t("errors.count", { count: row.count })}
        </span>
      </div>
      <p className="mt-3 text-balance font-display text-xl font-bold leading-snug">
        {explanation.what}
      </p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-base md:grid-cols-[auto_1fr]">
        <dt className="font-semibold">{t("errors.where")}</dt>
        <dd>{explanation.where}</dd>
        <dt className="font-semibold">{t("errors.impact")}</dt>
        <dd>{explanation.impact}</dd>
        <dt className="font-semibold">{t("errors.action")}</dt>
        <dd>{explanation.action}</dd>
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        {when("errors.since", row.firstAt)} · {when("errors.last", row.lastAt)}
      </p>
      {!explanation.catalogued && (
        <p className="mt-3 text-sm font-semibold">{t("errors.uncatalogued")}</p>
      )}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-brand">
          {t("errors.technical")}
        </summary>
        <dl className="mt-2 grid gap-x-6 gap-y-1 font-mono md:grid-cols-[auto_1fr]">
          <dt>{t("errors.code")}</dt>
          <dd>{explanation.code}</dd>
          <dt>{t("errors.place")}</dt>
          <dd>{row.place}</dd>
          {row.lastRequestId !== null && (
            <>
              <dt>{t("errors.request")}</dt>
              <dd>{row.lastRequestId}</dd>
            </>
          )}
        </dl>
      </details>
    </li>
  );
}

/** The console's error journal, in plain words (CLAUDE.md §4.5). */
export function ErrorJournalList({ rows }: { rows: JournalRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-primary-container p-6 text-on-primary-container">
        {t("errors.none")}
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <ErrorCard key={`${row.explanation.code} ${row.place}`} row={row} />
      ))}
    </ul>
  );
}
