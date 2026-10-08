import { assistantUsageSchema, type AssistantUsage } from "@bgs/shared-types";
import { FigureTile } from "../../components/FigureTile";
import { adminRequest } from "../../lib/admin-api";
import { averageCost, estimatedCost, formatDollars, usedShare } from "../../lib/assistant-usage";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import { LimitForm } from "./LimitForm";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** "octobre 2026", from "2026-10". */
function monthName(month: string): string {
  return new Intl.DateTimeFormat("fr-SN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** How much of the month's questions is used, as a bar and in words. */
function UsedBar({ usage }: { usage: AssistantUsage }) {
  const share = usedShare(usage);
  return (
    <div>
      <p className="sr-only">
        {t("assistant.progress", {
          used: number.format(usage.questions),
          limit: number.format(usage.monthlyLimit),
          percent: percent.format(share),
        })}
      </p>
      <span aria-hidden="true" className="block h-3 rounded-full bg-surface">
        <span
          className={`block h-3 rounded-full ${share >= 1 ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${String(share * 100)}%` }}
        />
      </span>
    </div>
  );
}

function UsageView({ usage }: { usage: AssistantUsage }) {
  const average = averageCost(usage);
  return (
    <>
      {!usage.configured && (
        <p
          role="status"
          className="max-w-prose rounded-md bg-accent-container p-5 text-on-accent-container"
        >
          {t("assistant.notConfigured")}
        </p>
      )}
      <p className="text-sm text-ink-soft">
        {t("assistant.month", { month: monthName(usage.month) })}
      </p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FigureTile
          label={t("assistant.questions")}
          value={number.format(usage.questions)}
          detail={t("assistant.ofLimit", { limit: number.format(usage.monthlyLimit) })}
        />
        <FigureTile
          label={t("assistant.remaining")}
          value={number.format(Math.max(0, usage.monthlyLimit - usage.questions))}
        />
        <FigureTile
          label={t("assistant.cost")}
          value={formatDollars(estimatedCost(usage))}
          detail={
            average === null
              ? t("assistant.noQuestion")
              : `${t("assistant.average")} : ${formatDollars(average)}`
          }
        />
      </dl>
      <UsedBar usage={usage} />
      <p className="max-w-prose text-sm text-ink-soft">{t("assistant.costHelp")}</p>
      <LimitForm
        limit={usage.monthlyLimit}
        maxCost={average === null ? null : formatDollars(average * usage.monthlyLimit)}
      />
    </>
  );
}

/** The assistant's questions this month, their cost, and its monthly limit. */
export default async function AssistantPage() {
  const { token } = await requireAccount();
  const result = await adminRequest({ path: "/assistant", token, schema: assistantUsageSchema });
  return (
    <section aria-labelledby="assistant-title" className="space-y-6">
      <h1 id="assistant-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("assistant.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("assistant.intro")}</p>
      {result.ok ? (
        <UsageView usage={result.data} />
      ) : (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("review.forbidden") : t("assistant.failed")}
        </p>
      )}
    </section>
  );
}
