"use client";

import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { field, primaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { saveAssistantLimit } from "./actions";

/** The monthly limit of questions, and what it may cost at the current pace. */
export function LimitForm({ limit, maxCost }: { limit: number; maxCost: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAssistantLimit, {});
  return (
    <form action={action} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <label htmlFor="monthlyLimit" className="block font-semibold">
          {t("assistant.limit")}
        </label>
        <p id="limit-help" className="text-sm text-ink-soft">
          {t("assistant.limitHelp")}
        </p>
        <input
          id="monthlyLimit"
          name="monthlyLimit"
          defaultValue={String(limit)}
          inputMode="numeric"
          autoComplete="off"
          aria-describedby="limit-help"
          className={field}
        />
        {maxCost !== null && (
          <p className="text-sm text-ink-soft">{t("assistant.maxCost", { cost: maxCost })}</p>
        )}
      </div>
      <FormOutcome state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("assistant.save")}
      </button>
    </form>
  );
}
