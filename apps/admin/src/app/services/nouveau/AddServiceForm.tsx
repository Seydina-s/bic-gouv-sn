"use client";

import { useActionState } from "react";
import { IdempotencyKey } from "../../../components/IdempotencyKey";
import { FormOutcome } from "../../../components/FormOutcome";
import { field, primaryButton } from "../../../lib/form-styles";
import { t } from "../../../lib/i18n";
import { addService, type ServiceReviewState } from "../actions";
import { CategoryField, NameField, PositionField, type ServiceChoice } from "../ServiceFormParts";

/** A service the source misses, typed by a person: it then waits for its verification. */
export function AddServiceForm({
  categories,
  idempotencyKey,
}: {
  categories: ServiceChoice[];
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<ServiceReviewState, FormData>(addService, {});
  return (
    <form action={action} className="max-w-xl space-y-5">
      <IdempotencyKey value={idempotencyKey} />
      <NameField />
      <CategoryField categories={categories} />
      <PositionField />
      <div className="space-y-2">
        <label htmlFor="address" className="block font-semibold">
          {t("services.addressLabel")}
        </label>
        <input id="address" name="address" autoComplete="off" className={field} />
      </div>
      <div className="space-y-2">
        <label htmlFor="phone" className="block font-semibold">
          {t("services.phoneLabel")}
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="off" className={field} />
      </div>
      <FormOutcome state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("services.saveAdd")}
      </button>
    </form>
  );
}
