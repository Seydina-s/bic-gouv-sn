"use server";

import { z } from "zod";
import { adminRequest } from "../../../lib/admin-api";
import { formText } from "../../../lib/form";
import { t } from "../../../lib/i18n";

export type ActivationState = { done: false; error?: string } | { done: true };

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS: Partial<Record<string, string>> = {
  ACCOUNT_ACTIVATION_INVALID: t("activation.invalid"),
  ACCOUNT_PASSWORD_REJECTED: t("activation.rejected"),
  ADMIN_TOO_MANY_ATTEMPTS: t("activation.unavailable"),
};

/** The new person chooses a password with the code of the activation link. */
export async function activateAccount(
  _previous: ActivationState,
  form: FormData,
): Promise<ActivationState> {
  const code = formText(form, "code");
  if (code === "") {
    return { done: false, error: t("activation.incomplete") };
  }
  const password = formText(form, "password");
  if (password !== formText(form, "passwordAgain")) {
    return { done: false, error: t("activation.mismatch") };
  }
  const result = await adminRequest({
    path: "/auth/activate",
    method: "POST",
    body: { code, password },
    schema: z.null(),
  });
  if (!result.ok) {
    const known = result.code === null ? undefined : REFUSALS[result.code];
    return { done: false, error: known ?? t("activation.unavailable") };
  }
  return { done: true };
}
