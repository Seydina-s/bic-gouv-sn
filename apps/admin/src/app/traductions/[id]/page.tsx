import { translationReviewDetailSchema } from "@bgs/shared-types";
import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { adminRequest } from "../../../lib/admin-api";
import { t } from "../../../lib/i18n";
import { requireAccount } from "../../../lib/session";
import { DecisionForm } from "../DecisionForm";

export const dynamic = "force-dynamic";

/** One version of the article: its title, then its paragraphs as plain text. */
function Version({
  label,
  lang,
  title,
  paragraphs,
}: {
  label: string;
  lang: "fr" | "wo";
  title: string;
  paragraphs: string[];
}) {
  return (
    <article lang={lang} className="space-y-4 rounded-lg border border-line p-6">
      <p className="text-sm font-semibold text-ink-soft" lang="fr">
        {label}
      </p>
      <h2 className="font-display text-2xl font-bold leading-snug">{title}</h2>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line leading-relaxed">
          {paragraph}
        </p>
      ))}
    </article>
  );
}

/** The French and the machine Wolof side by side, then the decision. */
export default async function TranslationPage({ params }: { params: Promise<{ id: string }> }) {
  const { token } = await requireAccount();
  const { id } = await params;
  const result = await adminRequest({
    path: `/translations/${encodeURIComponent(id)}`,
    token,
    schema: translationReviewDetailSchema,
  });
  return (
    <section aria-labelledby="translation-title" className="space-y-6">
      <Link
        href="/traductions"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline underline-offset-4"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-5" />
        {t("translations.back")}
      </Link>
      <h1 id="translation-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("translations.title")}
      </h1>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403
            ? t("review.forbidden")
            : result.status === 404 || result.status === 409
              ? t("translations.notPending")
              : t("translations.failed")}
        </p>
      ) : (
        <>
          <a
            href={result.data.sourceUrl}
            rel="noreferrer"
            target="_blank"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand underline underline-offset-4"
          >
            <ArrowSquareOutIcon aria-hidden="true" className="size-5" />
            {t("translations.source")}
          </a>
          <div className="grid gap-6 lg:grid-cols-2">
            <Version label={t("translations.french")} lang="fr" {...result.data.french} />
            <Version label={t("translations.wolof")} lang="wo" {...result.data.wolof} />
          </div>
          <DecisionForm articleId={result.data.articleId} />
        </>
      )}
    </section>
  );
}
