"use client";

import { OPPORTUNITY_KINDS } from "@bgs/shared-types";
import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { IdempotencyKey } from "../../components/IdempotencyKey";
import { field, primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { decideOpportunity, prepareOpportunity } from "./actions";

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {children}
      {help !== undefined && (
        <p id={`${id}-help`} className="text-sm text-ink-soft">
          {help}
        </p>
      )}
    </div>
  );
}

/** Copies an opportunity from its official page: a second person publishes it. */
export function PrepareOpportunityForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(prepareOpportunity, {});
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <IdempotencyKey value={idempotencyKey} />
      <Field id="kind" label={t("opportunities.kind")}>
        <select id="kind" name="kind" required defaultValue="emploi" className={field}>
          {OPPORTUNITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`opportunities.kinds.${kind}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="title" label={t("opportunities.titleLabel")}>
        <input id="title" name="title" required minLength={3} maxLength={200} className={field} />
      </Field>
      <Field id="organization" label={t("opportunities.organization")}>
        <input
          id="organization"
          name="organization"
          required
          minLength={2}
          maxLength={120}
          className={field}
        />
      </Field>
      <Field id="summary" label={t("opportunities.summary")}>
        <textarea
          id="summary"
          name="summary"
          required
          minLength={10}
          maxLength={600}
          rows={4}
          className={field}
        />
      </Field>
      <Field id="deadline" label={t("opportunities.deadline")}>
        <input id="deadline" name="deadline" type="date" className={field} />
      </Field>
      <Field
        id="officialUrl"
        label={t("opportunities.officialUrl")}
        help={t("opportunities.officialUrlHelp")}
      >
        <input
          id="officialUrl"
          name="officialUrl"
          type="url"
          required
          inputMode="url"
          placeholder="https://"
          aria-describedby="officialUrl-help"
          className={field}
        />
      </Field>
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("opportunities.prepare")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}

/** Publish (another person than the author) or withdraw one opportunity. */
export function OpportunityDecision({ id, canPublish }: { id: string; canPublish: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideOpportunity, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-3">
        {canPublish && (
          <button
            type="submit"
            name="decision"
            value="publish"
            disabled={pending}
            className={primaryButton}
          >
            {t("opportunities.publish")}
          </button>
        )}
        <button
          type="submit"
          name="decision"
          value="withdraw"
          disabled={pending}
          className={secondaryButton}
        >
          {t("opportunities.withdraw")}
        </button>
      </div>
      <FormOutcome state={state} />
    </form>
  );
}
