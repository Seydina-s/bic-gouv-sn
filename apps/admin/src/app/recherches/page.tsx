import { searchMissesResponseSchema, SEARCH_MISS_MIN_COUNT } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

/**
 * Frequent searches that found nothing (decision of 28/09/2026: at least 3 times,
 * nothing kept about who searched): what people look for and the app lacks.
 */
export default async function SearchMissesPage() {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: "/search-misses",
    token,
    schema: searchMissesResponseSchema,
  });
  const minCount = result.ok ? result.data.minCount : SEARCH_MISS_MIN_COUNT;
  return (
    <section aria-labelledby="searches-title" className="space-y-6">
      <h1 id="searches-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("searches.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("searches.intro", { minCount })}</p>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("review.forbidden") : t("searches.failed")}
        </p>
      ) : result.data.entries.length === 0 ? (
        <p className="rounded-lg border border-line p-6">{t("searches.none", { minCount })}</p>
      ) : (
        <ol className="divide-y divide-line rounded-lg border border-line">
          {result.data.entries.map((entry) => (
            <li
              key={`${entry.area}|${entry.lang}|${entry.query}`}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 p-5"
            >
              <p className="font-display text-lg font-bold">
                {t("searches.quoted", { query: entry.query })}
              </p>
              <p className="text-sm text-ink-soft">
                {t(`searches.area.${entry.area}`)} · {t(`searches.language.${entry.lang}`)} ·{" "}
                <span className="font-semibold text-ink">
                  {t("searches.times", { count: entry.count })}
                </span>{" "}
                · {t("searches.lastOn", { day: formatDay(new Date(entry.lastOn)) })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
