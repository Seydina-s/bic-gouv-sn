"use server";

import {
  automaticNotificationsSchema,
  notificationSchema,
  PHOTO_MAX_BYTES,
} from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest, type AdminResult } from "../../lib/admin-api";
import { formIdempotencyKey, formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS = {
  ADMIN_FORBIDDEN: "notifications.editorsOnly",
  NOTIFICATION_SAME_PERSON: "notifications.samePerson",
  NOTIFICATION_NOT_PENDING: "notifications.alreadyDecided",
  NOTIFICATION_ALREADY_PENDING: "notifications.alreadyPending",
  NOTIFICATION_NOT_FOUND: "notifications.alreadyDecided",
  NOTIFICATION_ARTICLE_UNKNOWN: "notifications.unknownArticle",
  NOTIFICATION_PHOTO_INVALID: "notifications.photoInvalid",
} as const;

function refusal(result: Extract<AdminResult<unknown>, { ok: false }>): FormState {
  const key = Object.entries(REFUSALS).find(([code]) => code === result.code)?.[1];
  return { error: t(key ?? "notifications.failed") };
}

/** Prepares a notification announcing the chosen official article (its own title). */
export async function prepareNotification(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { token } = await requireAccount();
  const articleId = formText(form, "articleId");
  if (articleId === "") {
    return { error: t("notifications.choose") };
  }
  const result = await adminRequest({
    path: "/notifications",
    method: "POST",
    idempotencyKey: formIdempotencyKey(form),
    token,
    body: { articleId, lang: "fr" },
    schema: notificationSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/notifications");
  return { message: t("notifications.prepared") };
}

/** The photo chosen, as base64 (null without one); refused beyond 6 MB. */
async function photoOf(
  form: FormData,
): Promise<{ fits: true; base64: string | null } | { fits: false }> {
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { fits: true, base64: null };
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { fits: false };
  }
  return { fits: true, base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
}

/** Prepares a message written in the console, with its photo: checked by another person. */
export async function prepareMessage(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const title = formText(form, "title").trim();
  const body = formText(form, "body").trim();
  if (title === "" || body === "") {
    return { error: t("notifications.messageMissing") };
  }
  const photo = await photoOf(form);
  if (!photo.fits) {
    return { error: t("notifications.photoTooLarge") };
  }
  const result = await adminRequest({
    path: "/notifications/message",
    method: "POST",
    idempotencyKey: formIdempotencyKey(form),
    token,
    body: { title, body, lang: formText(form, "lang") === "wo" ? "wo" : "fr", photo: photo.base64 },
    schema: notificationSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/notifications");
  return { message: t("notifications.prepared") };
}

/** A second person approves (then it is sent), or someone cancels. */
export async function decideNotification(_previous: FormState, form: FormData): Promise<FormState> {
  const { token } = await requireAccount();
  const id = formText(form, "id");
  const decision = formText(form, "decision") === "approve" ? "approve" : "cancel";
  const result = await adminRequest({
    path: `/notifications/${encodeURIComponent(id)}/${decision}`,
    method: "POST",
    token,
    schema: notificationSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/notifications");
  return {
    message: t(decision === "approve" ? "notifications.approved" : "notifications.cancelled"),
  };
}

/** Pauses (any editor) or resumes (an administrator) the automatic notifications. */
export async function setAutomaticNotifications(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { token } = await requireAccount();
  const paused = formText(form, "paused") === "true";
  const result = await adminRequest({
    path: "/notifications/automatic",
    method: "PUT",
    token,
    body: { paused },
    schema: automaticNotificationsSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/notifications");
  return { message: t(paused ? "notifications.pausedDone" : "notifications.resumedDone") };
}
