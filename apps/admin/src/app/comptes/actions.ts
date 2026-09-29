"use server";

import { accountViewSchema, activationSchema, adminRoleSchema } from "@bgs/shared-types";
import { revalidatePath } from "next/cache";
import type { FormState } from "../../components/FormOutcome";
import { adminRequest, type AdminResult } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

/** An activation link just made: shown once, never kept by the console. */
export interface AccountFormState extends FormState {
  activation?: { code: string; expiresAt: string };
}

/** The API's refusals, in plain words; anything else is a passing failure. */
const REFUSALS = {
  ADMIN_FORBIDDEN: "accounts.adminsOnly",
  ACCOUNT_SELF: "accounts.refusals.self",
  ACCOUNT_EMAIL_TAKEN: "accounts.refusals.emailTaken",
  ACCOUNT_ALREADY_ACTIVE: "accounts.refusals.alreadyActive",
  ACCOUNT_NOT_FOUND: "accounts.refusals.notFound",
} as const;

function refusal(result: Extract<AdminResult<unknown>, { ok: false }>): AccountFormState {
  const key = Object.entries(REFUSALS).find(([code]) => code === result.code)?.[1];
  if (key !== undefined) {
    return { error: t(key) };
  }
  return {
    error: t(result.status === 400 ? "accounts.refusals.invalid" : "accounts.refusals.failed"),
  };
}

/** Adds a person: the API answers with the activation link's code, shown once. */
export async function createAccount(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const { token } = await requireAccount();
  const email = formText(form, "email").trim().toLowerCase();
  // A typo in the address makes the account unreachable (ERREURS.md, 26/09/2026).
  if (email !== formText(form, "emailAgain").trim().toLowerCase()) {
    return { error: t("accounts.emailMismatch") };
  }
  const role = adminRoleSchema.safeParse(formText(form, "role"));
  if (!role.success) {
    return { error: t("accounts.refusals.invalid") };
  }
  const result = await adminRequest({
    path: "/accounts",
    method: "POST",
    token,
    body: { name: formText(form, "name"), email, role: role.data },
    schema: activationSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/comptes");
  return {
    message: t("accounts.created"),
    activation: { code: result.data.code, expiresAt: result.data.expiresAt },
  };
}

export async function changeRole(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const { token } = await requireAccount();
  const role = adminRoleSchema.safeParse(formText(form, "role"));
  if (!role.success) {
    return { error: t("accounts.refusals.invalid") };
  }
  const result = await adminRequest({
    path: `/accounts/${encodeURIComponent(formText(form, "id"))}/role`,
    method: "POST",
    token,
    body: { role: role.data },
    schema: accountViewSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/comptes");
  return { message: t("accounts.roleChanged") };
}

const ACTIONS = {
  disable: "accounts.disabled",
  enable: "accounts.enabled",
  "reset-second-factor": "accounts.resetDone",
} as const;

function isAction(value: string): value is keyof typeof ACTIONS {
  return Object.hasOwn(ACTIONS, value);
}

/** Disable, enable, or reset the second factor (after checking who the person is). */
export async function changeAccess(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const { token } = await requireAccount();
  const action = formText(form, "action");
  if (!isAction(action)) {
    return { error: t("accounts.refusals.invalid") };
  }
  if (action === "reset-second-factor" && formText(form, "confirm") !== "yes") {
    return { error: t("accounts.resetConfirm") };
  }
  const result = await adminRequest({
    path: `/accounts/${encodeURIComponent(formText(form, "id"))}/${action}`,
    method: "POST",
    token,
    schema: accountViewSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/comptes");
  return { message: t(ACTIONS[action]) };
}

/** A new link for an account not activated yet; the previous one stops working. */
export async function renewActivation(
  _previous: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  const { token } = await requireAccount();
  const result = await adminRequest({
    path: `/accounts/${encodeURIComponent(formText(form, "id"))}/activation`,
    method: "POST",
    token,
    schema: activationSchema,
  });
  if (!result.ok) {
    return refusal(result);
  }
  revalidatePath("/comptes");
  return {
    message: t("accounts.renewed"),
    activation: { code: result.data.code, expiresAt: result.data.expiresAt },
  };
}
