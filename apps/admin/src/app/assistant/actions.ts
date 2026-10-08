"use server";

import { assistantLimitChangeSchema, assistantUsageSchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** Spaces people type between thousands, narrow ones included, are not part of the number. */
function typedNumber(text: string): number {
  const digits = text.replace(/\s/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
}

/** An admin changes the monthly limit of questions; the API checks and journals it. */
export async function saveAssistantLimit(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const change = assistantLimitChangeSchema.safeParse({
    monthlyLimit: typedNumber(formText(form, "monthlyLimit")),
  });
  if (!change.success) {
    return { error: t("assistant.invalid") };
  }
  const result = await adminRequest({
    path: "/assistant/limit",
    method: "PUT",
    token,
    body: change.data,
    schema: assistantUsageSchema,
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("assistant.adminOnly") : t("review.failed") };
  }
  revalidatePath("/assistant");
  return { message: t("assistant.saved") };
}
