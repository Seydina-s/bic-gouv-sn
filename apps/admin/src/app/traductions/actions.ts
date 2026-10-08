"use server";

import { translationDecisionSchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/**
 * A Wolof speaker validates a machine translation or sets it aside. The API checks
 * the role, versions the article and journals the decision; then the next one.
 */
export async function decideTranslation(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const articleId = z.uuid().safeParse(formText(form, "articleId"));
  const decision = translationDecisionSchema.safeParse({ decision: formText(form, "decision") });
  if (!articleId.success || !decision.success) {
    return { error: t("review.failed") };
  }
  const result = await adminRequest({
    path: `/translations/${articleId.data}/decision`,
    method: "POST",
    token,
    body: decision.data,
    schema: z.object({ saved: z.literal(true) }),
  });
  if (!result.ok) {
    if (result.status === 409 || result.status === 404) {
      return { error: t("translations.notPending") };
    }
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/traductions");
  redirect("/traductions");
}
