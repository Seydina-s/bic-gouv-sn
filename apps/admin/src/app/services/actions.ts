"use server";

import { type GeoPoint, geoPointSchema, inSenegal } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formText, formTexts } from "../../lib/form";
import { t } from "../../lib/i18n";
import { parsePosition, samePosition } from "../../lib/position";
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
 * The place typed or pasted in the form, when it moves the service: unchanged, it is
 * not sent (no correction appears in the journal for a place nobody moved).
 */
function movedTo(form: FormData): { location?: GeoPoint; error?: string } {
  const text = formText(form, "position").trim();
  if (text === "") {
    return {};
  }
  const typed = parsePosition(text);
  const before = parsePosition(formText(form, "positionBefore"));
  if (typed === null) {
    return { error: t("services.positionInvalid") };
  }
  if (!inSenegal(typed)) {
    return { error: t("services.positionOutside") };
  }
  return before !== null && samePosition(typed, before) ? {} : { location: typed };
}

/**
 * A person corrects the kind, the name or the place of a service. The API keeps the
 * correction apart from the source's facts, so no import undoes it, and journals it.
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
  const place = movedTo(form);
  if (place.error !== undefined) {
    return { error: place.error };
  }
  const result = await adminRequest({
    path: `/services/${encodeURIComponent(id)}/correction`,
    method: "PATCH",
    token,
    body: { name, category, ...(place.location === undefined ? {} : { location: place.location }) },
    // Older API versions answer without the place: a move they ignored is caught.
    schema: z.object({ corrected: z.boolean(), location: geoPointSchema.optional() }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/services");
  const saved = result.data.location;
  if (
    place.location !== undefined &&
    (saved === undefined || !samePosition(saved, place.location))
  ) {
    return { error: t("services.positionNotSaved") };
  }
  return { message: t("services.corrected") };
}
