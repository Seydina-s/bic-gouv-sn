import Link from "next/link";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import { BatchForm, MoveForm, type ReviewProcedure } from "./ReviewForms";

export const dynamic = "force-dynamic";

const UNCLASSIFIED = "a-classer";

const reviewSchema = z.object({
  themes: z.array(z.object({ id: z.string(), title: z.string(), icon: z.string().nullable() })),
  procedures: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      summary: z.string().nullable(),
      themeId: z.string().nullable(),
      status: z.enum(["proposed", "validated", "unclassified"]),
    }),
  ),
});

type Row = z.infer<typeof reviewSchema>["procedures"][number];

function toReview(row: Row): ReviewProcedure {
  return { slug: row.slug, title: row.title, summary: row.summary };
}

/**
 * Review of the procedure themes: the platform proposes, a person validates before
 * anything is shown in the app (decisions.md, 26/09/2026).
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
  const selected =
    requested ??
    (unclassified.length > 0
      ? UNCLASSIFIED
      : (themes.find((theme) => proposedIn(theme.id).length > 0)?.id ?? themes[0]?.id));
  const theme = themes.find((item) => item.id === selected);
  const choices = themes.map(({ id, title }) => ({ id, title }));

  const link = (id: string, label: string, detail: string) => (
    <li key={id}>
      <Link
        href={`/demarches?theme=${id}`}
        aria-current={id === selected ? "page" : undefined}
        className="block rounded-md px-3 py-2 hover:bg-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container"
      >
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-ink-soft">{detail}</span>
      </Link>
    </li>
  );

  return (
    <section aria-labelledby="review-title">
      <h1 id="review-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("review.title")}
      </h1>
      <p className="mt-2 max-w-prose text-ink-soft">{t("review.intro")}</p>

      <div className="mt-10 grid gap-10 md:grid-cols-[18rem_1fr]">
        <nav aria-label={t("review.themes")}>
          <ul className="space-y-1">
            {link(
              UNCLASSIFIED,
              t("review.unclassified"),
              t("review.toCheck", { count: unclassified.length }),
            )}
            {themes.map((item) =>
              link(
                item.id,
                item.title,
                `${t("review.toCheck", { count: proposedIn(item.id).length })} · ${t("review.validated", { count: validatedIn(item.id).length })}`,
              ),
            )}
          </ul>
        </nav>

        <div className="min-w-0 space-y-10">
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
          ) : theme === undefined ? null : (
            <>
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold">
                  {t("review.proposedTitle", { theme: theme.title })}
                </h2>
                {proposedIn(theme.id).length === 0 ? (
                  <p>{t("review.none")}</p>
                ) : (
                  <>
                    <p className="text-ink-soft">{t("review.proposedIntro")}</p>
                    <BatchForm theme={theme} procedures={proposedIn(theme.id).map(toReview)} />
                    <details className="rounded-lg border border-line p-4">
                      <summary className="cursor-pointer font-semibold text-brand">
                        {t("review.moveSummary")}
                      </summary>
                      <ul className="mt-4 space-y-6">
                        {proposedIn(theme.id).map((row) => (
                          <li key={row.slug}>
                            <MoveForm
                              procedure={toReview(row)}
                              themes={choices}
                              current={theme.id}
                            />
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                )}
              </div>
              {validatedIn(theme.id).length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-bold">
                    {t("review.validatedTitle", { theme: theme.title })}
                  </h2>
                  <ul className="list-disc space-y-1 pl-6 text-ink-soft">
                    {validatedIn(theme.id).map((row) => (
                      <li key={row.slug}>{row.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
