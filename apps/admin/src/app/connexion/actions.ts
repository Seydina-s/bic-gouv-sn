"use server";

import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { z } from "zod";
import { adminRequest } from "../../lib/admin-api";
import { formText } from "../../lib/form";
import { t } from "../../lib/i18n";
import {
  accountSchema,
  CHALLENGE_COOKIE,
  clearCookie,
  readCookie,
  SESSION_COOKIE,
  setChallengeCookie,
  setSessionCookie,
} from "../../lib/session";

export type SignInState =
  | { step: "password"; error?: string }
  | { step: "code"; error?: string }
  | { step: "enroll"; qrSvg: string; secret: string; error?: string };

const passwordStepSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("code"), challenge: z.string() }),
  z.object({
    step: z.literal("enroll"),
    challenge: z.string(),
    otpauthUri: z.string(),
    secret: z.string(),
  }),
]);

/** Plain-words message for a refused sign-in step (unknown codes: temporarily unavailable). */
function failureMessage(code: string | null): string {
  const messages: Record<string, string> = {
    ADMIN_TOO_MANY_ATTEMPTS: t("signIn.locked"),
    ADMIN_SESSION_EXPIRED: t("signIn.expired"),
    ADMIN_SIGN_IN_FAILED: t("signIn.failed"),
  };
  return (code === null ? undefined : messages[code]) ?? t("signIn.unavailable");
}

/** Step 1: e-mail and password. */
async function submitPassword(form: FormData): Promise<SignInState> {
  const result = await adminRequest({
    path: "/auth/password",
    method: "POST",
    body: { email: formText(form, "email"), password: formText(form, "password") },
    schema: passwordStepSchema,
  });
  if (!result.ok) {
    return { step: "password", error: failureMessage(result.code) };
  }
  await setChallengeCookie(result.data.challenge);
  if (result.data.step === "code") {
    return { step: "code" };
  }
  // First sign-in: the QR code is drawn on the server, the secret never goes elsewhere.
  const qrSvg = await QRCode.toString(result.data.otpauthUri, { type: "svg", margin: 1 });
  return { step: "enroll", qrSvg, secret: result.data.secret };
}

/** Step 2: the 6-digit code; opens the session. */
async function submitCode(previous: SignInState, form: FormData): Promise<SignInState> {
  const challenge = await readCookie(CHALLENGE_COOKIE);
  if (challenge === null) {
    return { step: "password", error: t("signIn.expired") };
  }
  const result = await adminRequest({
    path: "/auth/code",
    method: "POST",
    body: { challenge, code: formText(form, "code").replace(/\s+/g, "") },
    schema: z.object({ token: z.string(), account: accountSchema }),
  });
  if (!result.ok) {
    if (result.code === "ADMIN_SESSION_EXPIRED" || result.code === "ADMIN_TOO_MANY_ATTEMPTS") {
      await clearCookie(CHALLENGE_COOKIE);
      return { step: "password", error: failureMessage(result.code) };
    }
    return { ...previous, error: failureMessage(result.code) };
  }
  await clearCookie(CHALLENGE_COOKIE);
  await setSessionCookie(result.data.token);
  redirect("/");
}

/** The sign-in form moves forward one step at a time: password, then code. */
export async function advanceSignIn(previous: SignInState, form: FormData): Promise<SignInState> {
  return previous.step === "password" ? submitPassword(form) : submitCode(previous, form);
}

export async function signOut(): Promise<void> {
  const token = await readCookie(SESSION_COOKIE);
  if (token !== null) {
    await adminRequest({ path: "/auth/sign-out", method: "POST", token, schema: z.null() });
  }
  await clearCookie(SESSION_COOKIE);
  redirect("/connexion");
}
