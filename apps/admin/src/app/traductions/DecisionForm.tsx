"use client";

import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { decideTranslation } from "./actions";

/** Validate or set aside, each with what it changes in the app. */
export function DecisionForm({ articleId }: { articleId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideTranslation, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="articleId" value={articleId} />
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-bold">{t("translations.decide")}</legend>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2 sm:flex-1">
            <button
              type="submit"
              name="decision"
              value="validate"
              disabled={pending}
              aria-describedby="validate-help"
              className={primaryButton}
            >
              {t("translations.validate")}
            </button>
            <p id="validate-help" className="text-sm text-ink-soft">
              {t("translations.validateHelp")}
            </p>
          </div>
          <div className="space-y-2 sm:flex-1">
            <button
              type="submit"
              name="decision"
              value="set-aside"
              disabled={pending}
              aria-describedby="set-aside-help"
              className={secondaryButton}
            >
              {t("translations.setAside")}
            </button>
            <p id="set-aside-help" className="text-sm text-ink-soft">
              {t("translations.setAsideHelp")}
            </p>
          </div>
        </div>
      </fieldset>
      <FormOutcome state={state} />
    </form>
  );
}
