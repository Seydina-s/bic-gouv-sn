"use client";

import Link from "next/link";
import { useActionState } from "react";
import { primaryButton, secondaryButton } from "../../lib/form-styles";
import { t } from "../../lib/i18n";
import { reviewServices, type ServiceReviewState } from "./actions";
import { FormOutcome } from "./ServiceFormParts";

export interface ReviewService {
  id: string;
  name: string;
  /** Town, address, hours: what the source says, to compare with the map. */
  details: string[];
  /** What deserves a closer look (a company's name, a vague name). */
  hints: string[];
  /** Where to check it: its object on OpenStreetMap, or the point moved or typed by hand. */
  mapUrl: string;
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
            <a
              href={service.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-brand underline underline-offset-4"
            >
              {t("services.openMap")}
            </a>
          </li>
        ))}
      </ul>
      <FormOutcome state={state} />
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
