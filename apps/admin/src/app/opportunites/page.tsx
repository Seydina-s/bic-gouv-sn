import { randomUUID } from "node:crypto";
import { adminOpportunitiesResponseSchema, isOpen, type Opportunity } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import {
  CorrectOpportunityForm,
  OpportunityDecision,
  PrepareOpportunityForm,
} from "./OpportunityForms";

export const dynamic = "force-dynamic";

function when(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  return { day: formatDay(date), time: formatClockTime(date) };
}

/** A calendar day (YYYY-MM-DD) in words, read at noon so no time zone shifts it. */
function calendarDay(day: string): string {
  return formatDay(new Date(`${day}T12:00:00Z`));
}

function historyLines(item: Opportunity): string[] {
  const lines = [
    t("opportunities.preparedBy", { name: item.preparedBy.name, ...when(item.preparedAt) }),
  ];
  if (item.publishedBy !== null && item.publishedAt !== null) {
    lines.push(
      t("opportunities.publishedBy", { name: item.publishedBy.name, ...when(item.publishedAt) }),
    );
  }
  if (item.withdrawnBy !== null && item.withdrawnAt !== null) {
    lines.push(
      t("opportunities.withdrawnBy", { name: item.withdrawnBy.name, ...when(item.withdrawnAt) }),
    );
  }
  return lines;
}

function OpportunityCard({
  item,
  today,
  decision,
}: {
  item: Opportunity;
  today: string;
  decision: React.ReactNode;
}) {
  return (
    <li className="space-y-3 rounded-lg border border-line p-6">
      <p className="text-sm font-semibold text-brand">{t(`opportunities.kinds.${item.kind}`)}</p>
      <p className="text-balance font-display text-xl font-bold leading-snug">{item.title}</p>
      <p className="font-semibold">{item.organization}</p>
      <p className="max-w-prose">{item.summary}</p>
      <p className="text-sm">
        {item.deadline === null
          ? t("opportunities.noDeadline")
          : t("opportunities.deadlineLine", { day: calendarDay(item.deadline) })}
        {item.status === "published" && !isOpen(item, today) && (
          <span className="ml-2 font-semibold">{t("opportunities.closed")}</span>
        )}
      </p>
      <a
        href={item.officialUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block font-semibold text-brand underline underline-offset-4"
      >
        {t("opportunities.officialLink")}
      </a>
      <ul className="space-y-1 text-sm text-ink-soft">
        {historyLines(item).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {decision}
    </li>
  );
}

/**
 * Opportunités (decision of the user, 01/10/2026): an editor copies an opportunity
 * from its official page; another one checks and publishes it; either withdraws it.
 */
export default async function OpportunitiesPage() {
  const { token, account } = await requireAccount();
  const result = await adminRequest({
    path: "/opportunities",
    token,
    schema: adminOpportunitiesResponseSchema,
  });
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {t("opportunities.listFailed")}
      </p>
    );
  }
  const { opportunities } = result.data;
  const canEdit = account.role !== "reviewer";
  const today = new Date().toISOString().slice(0, 10);
  const pending = opportunities.filter((item) => item.status === "pending");
  const published = opportunities.filter((item) => item.status === "published");
  const withdrawn = opportunities.filter((item) => item.status === "withdrawn");

  return (
    <section aria-labelledby="opportunities-title" className="space-y-10">
      <div className="space-y-4">
        <h1
          id="opportunities-title"
          className="font-display text-3xl font-extrabold tracking-tight"
        >
          {t("opportunities.title")}
        </h1>
        <p className="max-w-prose text-ink-soft">{t("opportunities.intro")}</p>
      </div>

      {canEdit && (
        <section aria-labelledby="prepare-title" className="space-y-4">
          <h2 id="prepare-title" className="font-display text-2xl font-bold">
            {t("opportunities.prepareTitle")}
          </h2>
          <PrepareOpportunityForm idempotencyKey={randomUUID()} />
        </section>
      )}

      <section aria-labelledby="pending-title" className="space-y-4">
        <h2 id="pending-title" className="font-display text-2xl font-bold">
          {t("opportunities.pendingTitle")}
        </h2>
        {pending.length === 0 ? (
          <p className="text-ink-soft">{t("opportunities.noPending")}</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                today={today}
                decision={
                  canEdit && (
                    <>
                      <CorrectOpportunityForm id={item.id} draft={item} />
                      <OpportunityDecision
                        id={item.id}
                        canPublish={item.preparedBy.id !== account.id}
                      />
                    </>
                  )
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="published-title" className="space-y-4">
        <h2 id="published-title" className="font-display text-2xl font-bold">
          {t("opportunities.publishedTitle")}
        </h2>
        {published.length === 0 ? (
          <p className="text-ink-soft">{t("opportunities.noPublished")}</p>
        ) : (
          <ul className="space-y-4">
            {published.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                today={today}
                decision={canEdit && <OpportunityDecision id={item.id} canPublish={false} />}
              />
            ))}
          </ul>
        )}
      </section>

      {withdrawn.length > 0 && (
        <section aria-labelledby="past-title" className="space-y-4">
          <h2 id="past-title" className="font-display text-2xl font-bold">
            {t("opportunities.pastTitle")}
          </h2>
          <ul className="space-y-4">
            {withdrawn.map((item) => (
              <OpportunityCard key={item.id} item={item} today={today} decision={null} />
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
