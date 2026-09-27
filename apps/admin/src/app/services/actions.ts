"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formText, formTexts } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export interface ServiceReviewState {
  message?: string;
  error?: string;
}

/**
 * A person's decision on the services they checked: verified (then shown in the
 * app) or rejected. The button pressed says which; the API journals the batch.
 */
export async function reviewServices(
  _previous: ServiceReviewState,
  form: FormData,
): Promise<ServiceReviewState> {
  const { token } = await requireAccount();
  const decision = formText(form, "decision");
  const ids = formTexts(form, "id");
  if (ids.length === 0 || (decision !== "verified" && decision !== "rejected")) {
    return {};
  }
  const result = await adminRequest({
    path: "/services/review",
    method: "POST",
    token,
    body: { decision, ids },
    schema: z.object({ reviewed: z.int() }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/services");
  const count = result.data.reviewed;
  return {
    message:
      decision === "verified"
        ? t("services.doneVerified", { count })
        : t("services.doneRejected", { count }),
  };
}
