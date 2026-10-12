import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  QuestionIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/dist/ssr";
import { formatClockTime, formatDay } from "../lib/format";
import { t } from "../lib/i18n";
import type { SourceRow } from "../lib/sources";

const COUNT = new Intl.NumberFormat("fr-FR");

/** Each protection state in words, with its icon: never the colour alone. */
const PROTECTION = {
  closed: { key: "sources.protection.closed", Icon: CheckCircleIcon, ink: "text-ink-soft" },
  "half-open": {
    key: "sources.protection.halfOpen",
    Icon: ArrowsClockwiseIcon,
    ink: "text-ink",
  },
  open: { key: "sources.protection.open", Icon: WarningOctagonIcon, ink: "font-semibold" },
  unknown: { key: "sources.protection.unknown", Icon: QuestionIcon, ink: "text-ink-soft" },
} as const;

/** A publication day ("2026-10-02"), read at noon so no time zone shifts it. */
function dayInWords(day: string): string {
  return formatDay(new Date(`${day}T12:00:00Z`));
}

/**
 * "Sources suivies": one line per institution whose news the app carries, so that a
 * person sees at a glance which sites are followed and since when nothing came. A
 * suspended site comes first.
 */
export function SourcesTable({ rows }: { rows: readonly SourceRow[] | null }) {
  if (rows === null) {
    return <p className="max-w-prose text-base text-ink-soft">{t("sources.unreadable")}</p>;
  }
  return (
    <div className="space-y-4">
      <p className="max-w-prose text-base text-ink-soft">{t("sources.intro")}</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-surface text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("sources.columns.institution")}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t("sources.columns.articles")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("sources.columns.newest")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("sources.columns.fetched")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("sources.columns.protection")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SourceLine key={row.institution} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceLine({ row }: { row: SourceRow }) {
  const { key, Icon, ink } = PROTECTION[row.circuit ?? "unknown"];
  const fetched = row.lastFetchedAt === null ? null : new Date(row.lastFetchedAt);
  return (
    <tr
      className={`border-t border-line ${row.circuit === "open" ? "bg-danger-surface text-on-danger-surface" : ""}`}
    >
      <th scope="row" className="px-4 py-3 font-semibold">
        {row.name}
      </th>
      <td className="px-4 py-3 text-right tabular-nums">{COUNT.format(row.total)}</td>
      <td className="px-4 py-3">
        {row.newestOn === null ? t("sources.unknownDay") : dayInWords(row.newestOn)}
      </td>
      <td className="px-4 py-3">
        {fetched === null
          ? t("sources.unknownDay")
          : t("sources.fetchedAt", { day: formatDay(fetched), time: formatClockTime(fetched) })}
      </td>
      <td className={`px-4 py-3 ${ink}`}>
        <span className="inline-flex items-center gap-2">
          <Icon aria-hidden="true" weight="duotone" className="size-5 shrink-0" />
          {t(key)}
        </span>
      </td>
    </tr>
  );
}
