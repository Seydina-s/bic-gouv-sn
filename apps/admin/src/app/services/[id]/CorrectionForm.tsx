"use client";

import { useActionState } from "react";
import { primaryButton } from "../../../lib/form-styles";
import { t } from "../../../lib/i18n";
import { correctService, type ServiceReviewState } from "../actions";
import {
  CategoryField,
  FormOutcome,
  NameField,
  PositionField,
  type ServiceChoice,
} from "../ServiceFormParts";

/** The name, the kind and the place of one service, as a person corrects them. */
export function CorrectionForm({
  id,
  name,
  category,
  categories,
  position,
  positionLink,
}: {
  id: string;
  name: string;
  category: string;
  categories: ServiceChoice[];
  /** The place shown now, as "latitude, longitude". */
  position: string;
  /** That place on openstreetmap.org. */
  positionLink: string;
}) {
  const [state, action, pending] = useActionState<ServiceReviewState, FormData>(correctService, {});
  return (
    <form action={action} className="max-w-xl space-y-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="positionBefore" value={position} />
      <NameField name={name} />
      <CategoryField categories={categories} category={category} />
      <PositionField position={position} />
      <a
        href={positionLink}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-sm font-semibold text-brand underline underline-offset-4"
      >
        {t("services.openPosition")}
      </a>
      <FormOutcome state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("services.saveCorrection")}
      </button>
    </form>
  );
}
