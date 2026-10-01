"use client";

import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { markHandled } from "./actions";

/** "Marquer comme traité", for one message or report. */
export function HandleForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(markHandled, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={secondaryButton}>
        {t("participation.handle")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}
