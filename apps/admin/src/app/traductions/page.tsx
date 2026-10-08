import { translationsToReviewSchema } from "@bgs/shared-types";
import Link from "next/link";
import { adminRequest } from "../../lib/admin-api";
import { formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

/** Machine translations into Wolof waiting for a Wolof speaker, newest first. */
export default async function TranslationsPage() {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: "/translations",
    token,
    schema: translationsToReviewSchema,
  });
  return (
    <section aria-labelledby="translations-title" className="space-y-6">
      <h1 id="translations-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("translations.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("translations.intro")}</p>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("review.forbidden") : t("translations.failed")}
        </p>
      ) : result.data.translations.length === 0 ? (
        <p className="rounded-lg border border-line p-6">{t("translations.none")}</p>
      ) : (
        <>
          <p className="font-semibold">
            {t("translations.count", { count: result.data.translations.length })}
          </p>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {result.data.translations.map((item) => (
              <li key={item.articleId}>
                <Link
                  href={`/traductions/${item.articleId}`}
                  className="block space-y-1 p-5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span lang="wo" className="block font-display text-lg font-bold leading-snug">
                    {item.wolofTitle}
                  </span>
                  <span className="block text-ink-soft">{item.frenchTitle}</span>
                  {item.publishedOn !== null && (
                    <span className="block text-sm text-ink-soft">
                      {t("translations.publishedOn", {
                        day: formatDay(new Date(`${item.publishedOn}T12:00:00Z`)),
                      })}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
