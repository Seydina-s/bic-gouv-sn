"use server";

import { type GeoPoint, geoPointSchema, inSenegal } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formIdempotencyKey, formText, formTexts } from "../../lib/form";
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

type Place = { location: GeoPoint } | { error: string };

/** The place typed or pasted in the form: null when empty, else a point in Senegal. */
function placeIn(form: FormData): Place | null {
  const text = formText(form, "position").trim();
  if (text === "") {
    return null;
  }
  const typed = parsePosition(text);
  if (typed === null) {
    return { error: t("services.positionInvalid") };
  }
  return inSenegal(typed) ? { location: typed } : { error: t("services.positionOutside") };
}

/**
 * The place typed or pasted in the form, when it moves the service: unchanged, it is
 * not sent (no correction appears in the journal for a place nobody moved).
 */
function movedTo(form: FormData): { location?: GeoPoint; error?: string } {
  const place = placeIn(form);
  if (place === null || "error" in place) {
    return place ?? {};
  }
  const before = parsePosition(formText(form, "positionBefore"));
  return before !== null && samePosition(place.location, before) ? {} : place;
}

/** An optional text of the form: null when left empty. */
function optionalText(form: FormData, key: string): string | null {
  const value = formText(form, key).trim();
  return value === "" ? null : value;
}

/**
 * A person adds a service the source misses. It joins the services to verify:
 * nothing reaches the app before a person verifies it.
 */
export async function addService(
  _previous: ServiceReviewState,
  form: FormData,
): Promise<ServiceReviewState> {
  const { token } = await requireAccount();
  const name = formText(form, "name").trim();
  const category = formText(form, "category");
  if (name === "") {
    return {};
  }
  const place = placeIn(form) ?? { error: t("services.positionInvalid") };
  if ("error" in place) {
    return { error: place.error };
  }
  const result = await adminRequest({
    path: "/services",
    method: "POST",
    idempotencyKey: formIdempotencyKey(form),
    token,
    body: {
      name,
      category,
      location: place.location,
      address: optionalText(form, "address"),
      phone: optionalText(form, "phone"),
    },
    schema: z.object({ id: z.string() }),
  });
  if (!result.ok) {
    return { error: result.status === 403 ? t("review.forbidden") : t("review.failed") };
  }
  revalidatePath("/services");
  // A new key for the next service added from the same page.
  revalidatePath("/services/nouveau");
  return { message: t("services.added") };
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
