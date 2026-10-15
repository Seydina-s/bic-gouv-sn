import Link from "next/link";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { secondaryLink } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import { BatchForm, MoveForm, type ReviewProcedure } from "./ReviewForms";

export const dynamic = "force-dynamic";

const UNCLASSIFIED = "a-classer";
/** Classifications the user delegated to Claude (apps/api procedures:classify). */
const DELEGATED_REVIEWER = "delegation:claude";

const reviewSchema = z.object({
  themes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      icon: z.string().nullable(),
      origin: z.enum(["source", "platform"]).default("source"),
    }),
  ),
  procedures: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
      themeId: z.string().nullable(),
      status: z.enum(["proposed", "validated", "unclassified"]),
      reviewedBy: z.string().nullable().default(null),
    }),
  ),
});

type Row = z.infer<typeof reviewSchema>["procedures"][number];

function toReview(row: Row): ReviewProcedure {
  return { slug: row.slug, title: row.title, summary: row.summary };
}

/**
 * The procedure themes, validated (decisions.md, 26/09/2026): the themes first, each
 * opening its procedures, which can be moved to another theme (owner's request,
 * 14/10/2026); procedures still to place or proposed wait here for a person.
 */
export default async function ProcedureThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const { token } = await requireAccount();
  const review = await adminRequest({ path: "/procedure-themes", token, schema: reviewSchema });
  if (!review.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {review.status === 403 ? t("review.forbidden") : t("review.failed")}
      </p>
    );
  }
  const { themes, procedures } = review.data;
  const unclassified = procedures.filter((row) => row.status === "unclassified");
  const proposedIn = (id: string) =>
    procedures.filter((row) => row.themeId === id && row.status === "proposed");
  const validatedIn = (id: string) =>
    procedures.filter((row) => row.themeId === id && row.status === "validated");

  const requested = (await searchParams).theme;
  const selected = requested ?? null;
  const theme = themes.find((item) => item.id === selected);
  const choices = themes.map(({ id, title }) => ({ id, title }));
  const card = (id: string, label: string, detail: string) => (
    <li key={id}>
      <Link
        href={`/demarches?theme=${id}`}
        className="block h-full rounded-lg border border-line p-5 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="block font-display text-lg font-bold">{label}</span>
        <span className="mt-1 block text-sm text-ink-soft">{detail}</span>
      </Link>
    </li>
  );
  const counts = (id: string) =>
    [
      t("review.validated", { count: validatedIn(id).length }),
      ...(proposedIn(id).length > 0 ? [t("review.toCheck", { count: proposedIn(id).length })] : []),
    ].join(" · ");
  return (
    <section aria-labelledby="review-title">
      <h1 id="review-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("review.title")}
      </h1>
      <p className="mt-2 max-w-prose text-ink-soft">{t("review.intro")}</p>

      {selected === null ? (
        <nav aria-label={t("review.themes")} className="mt-10">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unclassified.length > 0 &&
              card(
                UNCLASSIFIED,
                t("review.unclassified"),
                t("review.toCheck", { count: unclassified.length }),
              )}
            {themes.map((item) =>
              card(
                item.id,
                item.origin === "platform"
                  ? `${item.title} (${t("review.addedTheme")})`
                  : item.title,
                counts(item.id),
              ),
            )}
          </ul>
        </nav>
      ) : (
        <div className="mt-10 min-w-0 space-y-10">
          <Link href="/demarches" className={secondaryLink}>
            {t("review.allThemes")}
          </Link>
          {selected === UNCLASSIFIED ? (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">{t("review.unclassified")}</h2>
              <p className="text-ink-soft">{t("review.unclassifiedIntro")}</p>
              {unclassified.length === 0 ? (
                <p>{t("review.none")}</p>
              ) : (
                <ul className="space-y-6">
                  {unclassified.map((row) => (
                    <li key={row.slug} className="rounded-lg border border-line p-4">
                      <MoveForm procedure={toReview(row)} themes={choices} current={null} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : theme === undefined ? (
            <p>{t("review.none")}</p>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">{theme.title}</h2>
              {proposedIn(theme.id).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold">
                    {t("review.proposedTitle", { theme: theme.title })}
                  </h3>
                  <p className="text-ink-soft">{t("review.proposedIntro")}</p>
                  <BatchForm theme={theme} procedures={proposedIn(theme.id).map(toReview)} />
                </div>
              )}
              {validatedIn(theme.id).length === 0 ? (
                <p>{t("review.none")}</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {validatedIn(theme.id).map((row) => (
                    <li key={row.slug} className="px-4 py-3">
                      <details>
                        <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="min-w-0 flex-1 font-semibold">{row.title}</span>
                          {row.reviewedBy === DELEGATED_REVIEWER && (
                            <span className="text-sm text-ink-faint">{t("review.byClaude")}</span>
                          )}
                          <span className="font-semibold text-brand">{t("review.edit")}</span>
                        </summary>
                        <div className="mt-4">
                          <MoveForm procedure={toReview(row)} themes={choices} current={theme.id} />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
