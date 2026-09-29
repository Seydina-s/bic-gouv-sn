"use client";

import { useActionState } from "react";
import { IdempotencyKey } from "../../components/IdempotencyKey";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { field, primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { decideNotification, prepareNotification } from "./actions";

export interface ArticleChoice {
  id: string;
  label: string;
}

/** Chooses one of the latest official articles: its title becomes the notification. */
export function PrepareForm({
  articles,
  idempotencyKey,
}: {
  articles: readonly ArticleChoice[];
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(prepareNotification, {});
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <IdempotencyKey value={idempotencyKey} />
      <div className="space-y-2">
        <label htmlFor="articleId" className="block font-semibold">
          {t("notifications.article")}
        </label>
        <select id="articleId" name="articleId" required defaultValue="" className={field}>
          <option value="" disabled>
            {t("notifications.choose")}
          </option>
          {articles.map((article) => (
            <option key={article.id} value={article.id}>
              {article.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("notifications.prepare")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}

/** Approve (another person than the author) or cancel one waiting notification. */
export function DecisionForm({ id, canApprove }: { id: string; canApprove: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideNotification, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-3">
        {canApprove && (
          <button
            type="submit"
            name="decision"
            value="approve"
            disabled={pending}
            className={primaryButton}
          >
            {t("notifications.approve")}
          </button>
        )}
        <button
          type="submit"
          name="decision"
          value="cancel"
          disabled={pending}
          className={secondaryButton}
        >
          {t("notifications.cancel")}
        </button>
      </div>
      <FormOutcome state={state} />
    </form>
  );
}
