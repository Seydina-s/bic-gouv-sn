import { NewspaperIcon, QuestionIcon, WarningOctagonIcon } from "@phosphor-icons/react/dist/ssr";
import {
  assessIngestion,
  describeError,
  detectionObjective,
  type CircuitStatus,
  type IngestionStatus,
} from "@bgs/shared-types";
import { formatClockTime, formatDuration } from "../lib/format";
import { t } from "../lib/i18n";

const SHARE = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** One source's protection, in plain words (CLAUDE.md §4.5: visible in the console). */
function circuitLine(circuit: CircuitStatus): string {
  const name = circuit.dependency;
  if (circuit.state === "closed") {
    return t("ingestion.circuits.closed", { name });
  }
  if (circuit.state === "half-open") {
    return t("ingestion.circuits.halfOpen", { name });
  }
  return t("ingestion.circuits.open", {
    name,
    time: circuit.openedAt === null ? "" : formatClockTime(new Date(circuit.openedAt)),
    failures: circuit.consecutiveFailures,
  });
}

/**
 * News collection at a glance, for a non-technical reader: is presidence.sn being
 * followed, when was the last article picked up, and if not, what to do; then how
 * each source's protection stands. Failure wording comes from the shared catalog.
 */
export function IngestionPanel({ report, now }: { report: IngestionStatus | null; now: Date }) {
  const circuits = report?.circuits ?? [];
  const objective = detectionObjective(report, now);
  return (
    <div className="space-y-4">
      <IngestionVerdict report={report} now={now} />
      <section aria-labelledby="objective-title" className="px-1">
        <h3 id="objective-title" className="text-sm font-bold">
          {t("ingestion.objective.title")}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {objective === null
            ? t("ingestion.objective.none")
            : t("ingestion.objective.measured", {
                share: SHARE.format(objective.withinTarget),
                count: objective.count,
                median: formatDuration(objective.medianSeconds, t),
                p95: formatDuration(objective.p95Seconds, t),
              })}
        </p>
      </section>
      {circuits.length > 0 && (
        <section aria-labelledby="circuits-title" className="px-1">
          <h3 id="circuits-title" className="text-sm font-bold">
            {t("ingestion.circuits.title")}
          </h3>
          <ul className="mt-1 space-y-1 text-sm text-ink-soft">
            {circuits.map((circuit) => (
              <li key={circuit.dependency} className={circuit.state === "closed" ? "" : "text-ink"}>
                {circuitLine(circuit)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function IngestionVerdict({ report, now }: { report: IngestionStatus | null; now: Date }) {
  const verdict = assessIngestion(report, now);

  if (verdict.state === "ok" && report !== null) {
    return (
      <div className="rounded-lg bg-primary-container p-6 text-on-primary-container md:p-8">
        <div className="flex items-start gap-4">
          <NewspaperIcon aria-hidden="true" weight="duotone" className="mt-1 size-8 shrink-0" />
          <div>
            <p className="text-balance font-display text-2xl font-bold leading-tight md:text-3xl">
              {t("ingestion.ok.verdict")}
            </p>
            <p className="mt-2 text-base">
              {t("ingestion.ok.detail", { time: formatClockTime(new Date(report.checkedAt)) })}
            </p>
            {report.lastChangeAt !== null && report.lastDetectionSeconds !== null && (
              <p className="mt-1 text-base">
                {t("ingestion.lastArticle", {
                  time: formatClockTime(new Date(report.lastChangeAt)),
                  delay: formatDuration(report.lastDetectionSeconds, t),
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (verdict.state === "unknown" || verdict.state === "ok") {
    return (
      <div className="rounded-lg border border-line p-6 md:p-8">
        <div className="flex items-start gap-4">
          <QuestionIcon aria-hidden="true" weight="duotone" className="mt-1 size-8 shrink-0" />
          <div>
            <p className="text-balance font-display text-2xl font-bold leading-tight md:text-3xl">
              {t("ingestion.unknown.verdict")}
            </p>
            <p className="mt-2 max-w-prose text-base text-ink-soft">
              {t("ingestion.unknown.detail")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const code = verdict.state === "stopped" ? "INGESTION_STOPPED" : verdict.code;
  const explanation = describeError(code);
  return (
    <div className="rounded-lg bg-danger-surface p-6 text-on-danger-surface md:p-8">
      <div className="flex items-start gap-4">
        <WarningOctagonIcon aria-hidden="true" weight="duotone" className="mt-1 size-8 shrink-0" />
        <div>
          <p className="text-balance font-display text-2xl font-bold leading-tight md:text-3xl">
            {explanation.what}
          </p>
          <p className="mt-2 text-base">{explanation.impact}</p>
          <p className="mt-1 text-sm">
            {t("ingestion.since", { time: formatClockTime(new Date(verdict.since)) })}
          </p>
          {verdict.state === "failing" && verdict.nextAttemptAt !== null && (
            <p className="mt-3 max-w-prose text-base">
              {t("ingestion.nextAttempt", {
                time: formatClockTime(new Date(verdict.nextAttemptAt)),
              })}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 border-t border-current/20 pt-5 md:ml-12">
        <p className="text-sm font-bold">{t("status.whatToDo")}</p>
        <p className="mt-1 max-w-prose text-base">{explanation.action}</p>
        <p className="mt-3 font-mono text-xs">{t("status.errorCode", { code })}</p>
      </div>
    </div>
  );
}
