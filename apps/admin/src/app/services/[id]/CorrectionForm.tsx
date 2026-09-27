"use client";

import { useActionState } from "react";
import { t } from "../../../lib/i18n";
import { correctService, type ServiceReviewState } from "../actions";

export interface CorrectionChoice {
  value: string;
  label: string;
}

const field =
  "min-h-12 w-full rounded-md border border-line-strong bg-surface-raised px-4 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-on-primary hover:bg-primary-pressed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
  categories: CorrectionChoice[];
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
      <div className="space-y-2">
        <label htmlFor="name" className="block font-semibold">
          {t("services.nameLabel")}
        </label>
        <input id="name" name="name" defaultValue={name} required className={field} />
      </div>
      <div className="space-y-2">
        <label htmlFor="category" className="block font-semibold">
          {t("services.categoryLabel")}
        </label>
        <select id="category" name="category" defaultValue={category} className={field}>
          {categories.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="position" className="block font-semibold">
          {t("services.positionLabel")}
        </label>
        <p id="position-help" className="text-sm text-ink-soft">
          {t("services.positionHelp")}
        </p>
        <input
          id="position"
          name="position"
          defaultValue={position}
          required
          autoComplete="off"
          spellCheck={false}
          aria-describedby="position-help"
          className={field}
        />
        <a
          href={positionLink}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-semibold text-brand underline underline-offset-4"
        >
          {t("services.openPosition")}
        </a>
      </div>
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface">
          {state.error}
        </p>
      )}
      {state.message !== undefined && (
        <p
          role="status"
          className="rounded-md bg-primary-container px-4 py-3 text-on-primary-container"
        >
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("services.saveCorrection")}
      </button>
    </form>
  );
}
