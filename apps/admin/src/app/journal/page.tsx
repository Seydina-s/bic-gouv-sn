import { auditResponseSchema } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { auditActionLabel, auditActorLabel } from "../../lib/audit";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

/**
 * The immutable audit journal (CLAUDE.md §1), for administrators: who did what and
 * when, and whether any entry was changed or removed afterwards.
 */
export default async function AuditPage() {
  const { token } = await requireAccount();
  const result = await adminRequest({ path: "/audit", token, schema: auditResponseSchema });
  return (
    <section aria-labelledby="audit-title" className="space-y-6">
      <h1 id="audit-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("audit.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("audit.intro")}</p>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("audit.adminsOnly") : t("audit.failed")}
        </p>
      ) : (
        <>
          {result.data.intact ? (
            <p className="rounded-md bg-primary-container px-4 py-3 text-on-primary-container">
              {t("audit.intact", { total: result.data.total })}
            </p>
          ) : (
            <p
              role="alert"
              className="rounded-md bg-danger-surface p-6 font-semibold text-on-danger-surface"
            >
              {t("audit.broken", {
                day: formatDay(new Date(result.data.firstBrokenAt ?? "")),
                time: formatClockTime(new Date(result.data.firstBrokenAt ?? "")),
              })}
            </p>
          )}
          <h2 className="font-display text-xl font-bold">
            {t("audit.shown", { count: result.data.entries.length })}
          </h2>
          <ol className="divide-y divide-line rounded-lg border border-line">
            {result.data.entries.map((entry, index) => {
              const at = new Date(entry.at);
              const details = Object.entries(entry.details);
              return (
                <li key={`${entry.at}-${String(index)}`} className="space-y-1 px-5 py-4">
                  <p>
                    <span className="font-semibold">{auditActionLabel(entry.action)}</span>
                    {entry.target !== null && (
                      <span className="text-ink-soft">
                        {" "}
                        {t("audit.on", { target: entry.target })}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {auditActorLabel(entry.actor, entry.actorName)} · {formatDay(at)} ·{" "}
                    {formatClockTime(at)}
                  </p>
                  {details.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-semibold text-brand">
                        {t("audit.details")}
                      </summary>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                        {details.map(([key, value]) => (
                          <div key={key} className="contents">
                            <dt className="text-ink-soft">{key}</dt>
                            <dd className="break-all">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
