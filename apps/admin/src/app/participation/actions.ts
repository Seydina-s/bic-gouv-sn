"use server";

import { participationEntrySchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS = {
  ADMIN_FORBIDDEN: "participation.editorsOnly",
  PARTICIPATION_NOT_FOUND: "participation.gone",
} as const;

/** Marks a message or report as handled (dealt with, or passed on). */
export async function markHandled(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: `/participation/${encodeURIComponent(formText(form, "id"))}/handled`,
    method: "POST",
    token,
    schema: participationEntrySchema,
  });
  if (!result.ok) {
    const key = Object.entries(REFUSALS).find(([code]) => code === result.code)?.[1];
    return { error: t(key ?? "participation.failed") };
  }
  revalidatePath("/participation");
  return { message: t("participation.handledDone") };
}
