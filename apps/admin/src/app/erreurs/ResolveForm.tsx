"use client";

import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { resolveError } from "./actions";

/** "Marquer comme réglée", for one error group. */
export function ResolveForm({ code, where }: { code: string; where: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resolveError, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="where" value={where} />
      <button type="submit" disabled={pending} className={secondaryButton}>
        {t("errors.resolve")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}
