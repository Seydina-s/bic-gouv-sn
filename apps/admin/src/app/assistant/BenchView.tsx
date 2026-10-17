import type { AssistantBench } from "@bgs/shared-types";
import { FigureTile } from "../../components/FigureTile";
import { formatDollars } from "../../lib/assistant-usage";
import { t } from "../../lib/i18n";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** "17 octobre 2026", from "2026-10-17". */
function dayName(date: string): string {
  return new Intl.DateTimeFormat("fr-SN", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function share(passed: number, cases: number): string {
  return percent.format(cases === 0 ? 0 : passed / cases);
}

const KIND_KEYS = {
  "news-period": "assistant.bench.kinds.news-period",
  council: "assistant.bench.kinds.council",
  procedure: "assistant.bench.kinds.procedure",
  service: "assistant.bench.kinds.service",
  "search-direct": "assistant.bench.kinds.search-direct",
  "search-rephrased": "assistant.bench.kinds.search-rephrased",
  "search-citizen": "assistant.bench.kinds.search-citizen",
  trap: "assistant.bench.kinds.trap",
} as const;

/** The kind of question in words; a kind this console does not know yet, as written. */
function kindName(kind: string): string {
  return kind in KIND_KEYS ? t(KIND_KEYS[kind as keyof typeof KIND_KEYS]) : kind;
}

/**
 * The assistant's weekly test bench (AST-30f): the latest run by kind of question,
 * the trend, and the known weaknesses still asked every week until fixed.
 */
export function BenchView({ bench }: { bench: AssistantBench }) {
  const { latest } = bench;
  if (latest === null) {
    return <p className="max-w-prose text-ink-soft">{t("assistant.bench.none")}</p>;
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        {t("assistant.bench.date", { date: dayName(latest.date) })}
        {latest.fixed > 0 && ` · ${t("assistant.bench.fixed", { count: latest.fixed })}`}
      </p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FigureTile
          label={t("assistant.bench.passed")}
          value={number.format(latest.passed)}
          detail={t("assistant.bench.ofCases", {
            cases: number.format(latest.cases),
            percent: share(latest.passed, latest.cases),
          })}
        />
        <FigureTile
          label={t("assistant.bench.invented")}
          value={number.format(latest.invented)}
          detail={t("assistant.bench.inventedTarget")}
        />
        <FigureTile label={t("assistant.bench.cost")} value={formatDollars(latest.costUsd)} />
      </dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="bench-kinds" className="space-y-3">
          <h3 id="bench-kinds" className="font-display text-lg font-bold">
            {t("assistant.bench.byKind")}
          </h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {latest.byKind.map(({ kind, cases, passed }) => (
              <li key={kind} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span>{kindName(kind)}</span>
                <span className="tabular-nums text-ink-soft">
                  {t("assistant.bench.kindScore", {
                    passed: number.format(passed),
                    cases: number.format(cases),
                  })}{" "}
                  ({share(passed, cases)})
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="bench-trend" className="space-y-3">
          <h3 id="bench-trend" className="font-display text-lg font-bold">
            {t("assistant.bench.trend")}
          </h3>
          <ol className="divide-y divide-line rounded-lg border border-line">
            {bench.history.map(({ date, cases, passed }) => (
              <li key={date} className="px-4 py-3 tabular-nums">
                {t("assistant.bench.trendItem", {
                  date: dayName(date),
                  percent: share(passed, cases),
                })}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section aria-labelledby="bench-weaknesses" className="space-y-3">
        <h3 id="bench-weaknesses" className="font-display text-lg font-bold">
          {t("assistant.bench.weaknesses")} ({number.format(bench.weaknesses.length)})
        </h3>
        {bench.weaknesses.length === 0 ? (
          <p className="text-ink-soft">{t("assistant.bench.noWeakness")}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {bench.weaknesses.map((weakness) => (
              <li key={`${weakness.kind}|${weakness.question}`} className="space-y-1 px-4 py-3">
                <p className="font-medium">{weakness.question}</p>
                <p className="text-sm text-ink-soft">{weakness.reason}</p>
                <p className="text-xs text-ink-soft">
                  {kindName(weakness.kind)} ·{" "}
                  {t("assistant.bench.since", { date: dayName(weakness.since) })} ·{" "}
                  {t("assistant.bench.streak", { count: weakness.passedInARow })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
