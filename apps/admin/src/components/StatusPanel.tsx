import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ApiStatus } from "../lib/api-status";
import { formatClockTime, formatDuration } from "../lib/format";
import { t } from "../lib/i18n";

const FAILURE_COPY = {
  down: "status.down",
  invalid: "status.invalid",
  unconfigured: "status.unconfigured",
} as const;

function Verdict({ status }: { status: ApiStatus }) {
  if (status.state === "up") {
    return (
      <div className="flex items-start gap-4 rounded-lg bg-primary-container p-6 text-on-primary-container md:p-8">
        <span aria-hidden="true" className="relative mt-2 flex size-3 shrink-0">
          <span className="breathe absolute inset-0 rounded-full bg-primary" />
          <span className="relative size-3 rounded-full bg-primary" />
        </span>
        <div>
          <p className="text-balance font-display text-2xl font-bold leading-tight md:text-3xl">
            {t("status.up.verdict")}
          </p>
          <p className="mt-2 text-base">{t("status.up.detail")}</p>
        </div>
      </div>
    );
  }

  const copy = FAILURE_COPY[status.state];
  return (
    <div className="rounded-lg bg-danger-surface p-6 text-on-danger-surface md:p-8">
      <div className="flex items-start gap-4">
        <WarningOctagonIcon aria-hidden="true" weight="duotone" className="mt-1 size-8 shrink-0" />
        <div>
          <p className="text-balance font-display text-2xl font-bold leading-tight md:text-3xl">
            {t(`${copy}.verdict`)}
          </p>
          <p className="mt-2 text-base">{t(`${copy}.detail`)}</p>
        </div>
      </div>
      <div className="mt-6 border-t border-current/20 pt-5 md:ml-12">
        <p className="text-sm font-bold">{t("status.whatToDo")}</p>
        <p className="mt-1 max-w-prose text-base">{t(`${copy}.action`)}</p>
      </div>
    </div>
  );
}

/** Live health of the public API, written for a non-technical reader. */
export function StatusPanel({ status }: { status: ApiStatus }) {
  const time = formatClockTime(status.checkedAt);
  return (
    <section aria-labelledby="status-title">
      <h1
        id="status-title"
        className="text-balance font-display text-3xl font-extrabold tracking-tight md:text-4xl"
      >
        {t("status.title")}
      </h1>

      <div role="status" className="mt-8">
        <Verdict status={status} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span>{t("status.checkedAt", { time })}</span>
          {status.state === "up" && (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircleIcon aria-hidden="true" weight="duotone" className="size-4 text-brand" />
              {t("status.onlineSince", { duration: formatDuration(status.uptimeSeconds, t) })}
            </span>
          )}
        </p>
        <a
          href="/"
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-pressed"
        >
          <ArrowClockwiseIcon aria-hidden="true" weight="bold" className="size-5" />
          {t("status.recheck")}
        </a>
      </div>
    </section>
  );
}
