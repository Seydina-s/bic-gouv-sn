import { withdrawnArticlesResponseSchema } from "@bgs/shared-types";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { adminRequest } from "../../lib/admin-api";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

/**
 * Articles hidden because the Presidency withdrew them (decision of 28/09/2026):
 * the trace of what the app stopped showing, and since when. Read-only.
 */
export default async function WithdrawnPage() {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: "/news/withdrawn",
    token,
    schema: withdrawnArticlesResponseSchema,
  });
  return (
    <section aria-labelledby="withdrawn-title" className="space-y-6">
      <h1 id="withdrawn-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("withdrawn.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("withdrawn.intro")}</p>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("review.forbidden") : t("withdrawn.failed")}
        </p>
      ) : result.data.articles.length === 0 ? (
        <p className="rounded-lg border border-line p-6">{t("withdrawn.none")}</p>
      ) : (
        <>
          <p className="font-semibold">
            {t("withdrawn.count", { count: result.data.articles.length })}
          </p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.data.articles.map((article) => {
              const at = new Date(article.withdrawnAt);
              return (
                <li key={`${article.id}:${article.lang}`} className="space-y-1 p-5">
                  <p className="font-display text-lg font-bold leading-snug">{article.title}</p>
                  <p className="text-sm text-ink-soft">
                    {t(`withdrawn.language.${article.lang}`)} ·{" "}
                    {t("withdrawn.withdrawnOn", {
                      day: formatDay(at),
                      time: formatClockTime(at),
                    })}
                  </p>
                  <a
                    href={article.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                    className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline underline-offset-4"
                  >
                    <ArrowSquareOutIcon aria-hidden="true" className="size-5" />
                    {t("withdrawn.source")}
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
