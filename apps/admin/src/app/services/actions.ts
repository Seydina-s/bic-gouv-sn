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

/**
 * A person corrects the kind or the name of a service. The API keeps the correction
 * apart from the source's facts, so no import undoes it, and journals it.
 */
export async function correctService(
  _previous: ServiceReviewState,
  form: FormData,
): Promise<ServiceReviewState> {
  const { token } = await requireAccount();
  const id = formText(form, "id");
  const name = formText(form, "name").trim();
  const category = formText(form, "category");
  if (id === "" || name === "") {
    return {};
  }
  const result = await adminRequest({
    path: `/services/${encodeURIComponent(id)}/correction`,
    method: "PATCH",
    token,
    body: { name, category },
    schema: z.object({ corrected: z.boolean() }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/services");
  return { message: t("services.corrected") };
}
