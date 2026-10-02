"use server";

import { opportunitySchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest, type AdminResult } from "../../lib/admin-api";
import { formIdempotencyKey, formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS = {
  ADMIN_FORBIDDEN: "opportunities.editorsOnly",
  REQUEST_INVALID: "opportunities.invalid",
  OPPORTUNITY_SAME_PERSON: "opportunities.samePerson",
  OPPORTUNITY_NOT_PENDING: "opportunities.alreadyDecided",
  OPPORTUNITY_NOT_FOUND: "opportunities.alreadyDecided",
} as const;

function refusal(result: Extract<AdminResult<unknown>, { ok: false }>): FormState {
  const key = Object.entries(REFUSALS).find(([code]) => code === result.code)?.[1];
  return { error: t(key ?? "opportunities.failed") };
}

/** The opportunity as the form gives it: no closing date becomes null. */
function draftOf(form: FormData) {
  const deadline = formText(form, "deadline").trim();
  return {
    kind: formText(form, "kind"),
    title: formText(form, "title"),
    organization: formText(form, "organization"),
    summary: formText(form, "summary"),
    deadline: deadline === "" ? null : deadline,
    officialUrl: formText(form, "officialUrl").trim(),
  };
}

/** Prepares an opportunity copied from its official page; a second person publishes it. */
export async function prepareOpportunity(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: "/opportunities",
    method: "POST",
    idempotencyKey: formIdempotencyKey(form),
    token,
    body: draftOf(form),
    schema: opportunitySchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/opportunites");
  return { message: t("opportunities.prepared") };
}

/** Corrects an opportunity not yet published. */
export async function correctOpportunity(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: `/opportunities/${encodeURIComponent(formText(form, "id"))}`,
    method: "PUT",
    token,
    body: draftOf(form),
    schema: opportunitySchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/opportunites");
  return { message: t("opportunities.corrected") };
}

/** A second person publishes, or someone withdraws it from the app. */
export async function decideOpportunity(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const id = formText(form, "id");
  const decision = formText(form, "decision") === "publish" ? "publish" : "withdraw";
  const result = await adminRequest({
    path: `/opportunities/${encodeURIComponent(id)}/${decision}`,
    method: "POST",
    token,
    schema: opportunitySchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/opportunites");
  return {
    message: t(
      decision === "publish" ? "opportunities.publishedDone" : "opportunities.withdrawnDone",
    ),
  };
}
