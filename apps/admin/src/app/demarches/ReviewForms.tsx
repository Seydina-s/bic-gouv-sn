"use client";

import { useActionState, useState } from "react";
import { t } from "../../lib/i18n";
import { fileUnderTheme, type ReviewState } from "./actions";

export interface ReviewProcedure {
  slug: string;
  title: string;
  summary: string | null;
}

export interface ReviewTheme {
  id: string;
  title: string;
}

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-on-primary hover:bg-primary-pressed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong px-4 font-semibold text-brand hover:bg-surface disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Feedback({ state }: { state: ReviewState }) {
  if (state.error !== undefined) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface">
        {state.error}
      </p>
    );
  }
  return state.message === undefined ? null : (
    <p
      role="status"
      className="rounded-md bg-primary-container px-4 py-3 text-on-primary-container"
    >
      {state.message}
    </p>
  );
}

/** The proposals of one theme, all checked: unchecking keeps a procedure "to check". */
export function BatchForm({
  theme,
  procedures,
}: {
  theme: ReviewTheme;
  procedures: ReviewProcedure[];
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(fileUnderTheme, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="themeId" value={theme.id} />
      <input type="hidden" name="themeTitle" value={theme.title} />
      <ul className="divide-y divide-line rounded-lg border border-line">
        {procedures.map((procedure) => (
          <li key={procedure.slug}>
            <label className="flex cursor-pointer gap-4 p-4 hover:bg-surface">
              <input
                type="checkbox"
                name="slug"
                value={procedure.slug}
                defaultChecked
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span>
                <span className="block font-semibold">{procedure.title}</span>
                {procedure.summary !== null && (
                  <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">
                    {procedure.summary}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("review.validateChecked")}
      </button>
    </form>
  );
}

/** One procedure filed under the theme a person picks (correction, or "to classify"). */
export function MoveForm({
  procedure,
  themes,
  current,
}: {
  procedure: ReviewProcedure;
  themes: ReviewTheme[];
  current: string | null;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(fileUnderTheme, {});
  const [themeId, setThemeId] = useState(current ?? themes[0]?.id ?? "");
  const title = themes.find((theme) => theme.id === themeId)?.title ?? "";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="slug" value={procedure.slug} />
      <input type="hidden" name="themeTitle" value={title} />
      <label className="min-w-64 flex-1 text-sm font-semibold">
        {t("review.moveTo", { procedure: procedure.title })}
        <select
          name="themeId"
          value={themeId}
          onChange={(event) => {
            setThemeId(event.target.value);
          }}
          className="mt-1 block min-h-11 w-full rounded-md border border-line-strong bg-surface-raised px-3 text-base font-normal text-ink"
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.title}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={secondaryButton}>
        {t("review.fileHere")}
      </button>
      <div className="basis-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}
