"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t } from "../../lib/i18n";
import { reviewServices, type ServiceReviewState } from "./actions";

export interface ReviewService {
  id: string;
  name: string;
  /** Town, address, hours: what the source says, to compare with the map. */
  details: string[];
  /** What deserves a closer look (a company's name, a vague name). */
  hints: string[];
  osmUrl: string | null;
}

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-on-primary hover:bg-primary-pressed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md border border-line-strong px-6 font-semibold text-brand hover:bg-surface disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Feedback({ state }: { state: ServiceReviewState }) {
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

/**
 * Services to check, none ticked in advance: a person ticks what they checked on
 * the map, then verifies (shown in the app) or rejects the ticked ones.
 */
export function ServiceReviewForm({ services }: { services: ReviewService[] }) {
  const [state, action, pending] = useActionState<ServiceReviewState, FormData>(reviewServices, {});
  return (
    <form action={action} className="space-y-4">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {services.map((service) => (
          <li key={service.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
            <label className="flex min-w-0 flex-1 cursor-pointer gap-4">
              <input
                type="checkbox"
                name="id"
                value={service.id}
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span className="block font-semibold">{service.name}</span>
                {service.hints.map((hint) => (
                  <span
                    key={hint}
                    className="mt-1 mr-2 inline-block rounded-sm bg-accent-container px-2 py-0.5 text-sm font-semibold text-on-accent-container"
                  >
                    {hint}
                  </span>
                ))}
                {service.details.length > 0 && (
                  <span className="mt-1 block text-sm text-ink-soft">
                    {service.details.join(" · ")}
                  </span>
                )}
              </span>
            </label>
            <Link
              href={`/services/${service.id}`}
              className="text-sm font-semibold text-brand underline underline-offset-4"
            >
              {t("services.correct")}
            </Link>
            {service.osmUrl !== null && (
              <a
                href={service.osmUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-brand underline underline-offset-4"
              >
                {t("services.openMap")}
              </a>
            )}
          </li>
        ))}
      </ul>
      <Feedback state={state} />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="verified"
          disabled={pending}
          className={primaryButton}
        >
          {t("services.verifyChecked")}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className={secondaryButton}
        >
          {t("services.rejectChecked")}
        </button>
      </div>
    </form>
  );
}
