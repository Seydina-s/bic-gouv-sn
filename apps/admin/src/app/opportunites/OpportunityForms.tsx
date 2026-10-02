"use client";

import { OPPORTUNITY_KINDS, type OpportunityDraft } from "@bgs/shared-types";
import { useActionState } from "react";
import { FormOutcome, type FormState } from "../../components/FormOutcome";
import { IdempotencyKey } from "../../components/IdempotencyKey";
import { field, primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { correctOpportunity, decideOpportunity, prepareOpportunity } from "./actions";

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

/**
 * The fields of an opportunity, empty or filled with the one being corrected.
 * `prefix` keeps the ids unique when several forms share the page.
 */
function OpportunityFields({ prefix, initial }: { prefix: string; initial?: OpportunityDraft }) {
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <>
      <Field id={id("kind")} label={t("opportunities.kind")}>
        <select
          id={id("kind")}
          name="kind"
          required
          defaultValue={initial?.kind ?? "emploi"}
          className={field}
        >
          {OPPORTUNITY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`opportunities.kinds.${kind}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("title")} label={t("opportunities.titleLabel")}>
        <input
          id={id("title")}
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue={initial?.title}
          className={field}
        />
      </Field>
      <Field id={id("organization")} label={t("opportunities.organization")}>
        <input
          id={id("organization")}
          name="organization"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initial?.organization}
          className={field}
        />
      </Field>
      <Field id={id("summary")} label={t("opportunities.summary")}>
        <textarea
          id={id("summary")}
          name="summary"
          required
          minLength={10}
          maxLength={600}
          rows={4}
          defaultValue={initial?.summary}
          className={field}
        />
      </Field>
      <Field id={id("deadline")} label={t("opportunities.deadline")}>
        <input
          id={id("deadline")}
          name="deadline"
          type="date"
          defaultValue={initial?.deadline ?? ""}
          className={field}
        />
      </Field>
      <Field
        id={id("officialUrl")}
        label={t("opportunities.officialUrl")}
        help={t("opportunities.officialUrlHelp")}
      >
        <input
          id={id("officialUrl")}
          name="officialUrl"
          type="url"
          required
          inputMode="url"
          placeholder="https://"
          aria-describedby={`${id("officialUrl")}-help`}
          defaultValue={initial?.officialUrl}
          className={field}
        />
      </Field>
    </>
  );
}

/** Copies an opportunity from its official page: a second person publishes it. */
export function PrepareOpportunityForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(prepareOpportunity, {});
  return (
    <form action={action} className="max-w-2xl space-y-4">
      <IdempotencyKey value={idempotencyKey} />
      <OpportunityFields prefix="new" />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("opportunities.prepare")}
      </button>
      <FormOutcome state={state} />
    </form>
  );
}

/** Corrects an opportunity not yet published (a typo, a date), folded until asked for. */
export function CorrectOpportunityForm({ id, draft }: { id: string; draft: OpportunityDraft }) {
  const [state, action, pending] = useActionState<FormState, FormData>(correctOpportunity, {});
  return (
    <details>
      <summary className="cursor-pointer font-semibold text-brand">
        {t("opportunities.correct")}
      </summary>
      <form action={action} className="mt-4 max-w-2xl space-y-4">
        <input type="hidden" name="id" value={id} />
        <OpportunityFields prefix={id} initial={draft} />
        <button type="submit" disabled={pending} className={secondaryButton}>
          {t("opportunities.saveCorrection")}
        </button>
        <FormOutcome state={state} />
      </form>
    </details>
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
