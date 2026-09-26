"use client";

import { useActionState } from "react";
import { t } from "../../lib/i18n";
import { advanceSignIn, type SignInState } from "./actions";

const field =
  "mt-2 block w-full rounded-md border border-line-strong bg-surface-raised px-4 py-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const button =
  "mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-6 font-semibold text-on-primary hover:bg-primary-pressed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function ErrorLine({ message }: { message: string | undefined }) {
  return message === undefined ? null : (
    <p role="alert" className="mt-4 rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface">
      {message}
    </p>
  );
}

/** Password, then the one-time code (with the QR code at the very first sign-in). */
export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(advanceSignIn, {
    step: "password",
  });

  if (state.step === "password") {
    return (
      <form action={action} className="mt-8">
        <label className="block font-semibold">
          {t("signIn.email")}
          <input name="email" type="email" autoComplete="username" required className={field} />
        </label>
        <label className="mt-5 block font-semibold">
          {t("signIn.password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={field}
          />
        </label>
        <ErrorLine message={state.error} />
        <button type="submit" disabled={pending} className={button}>
          {t("signIn.continue")}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="mt-8">
      <h2 className="font-display text-xl font-bold">
        {state.step === "enroll" ? t("signIn.enrollTitle") : t("signIn.codeTitle")}
      </h2>
      <p className="mt-2 text-ink-soft">
        {state.step === "enroll" ? t("signIn.enrollIntro") : t("signIn.codeIntro")}
      </p>
      {state.step === "enroll" && (
        <div className="mt-6">
          <div
            aria-hidden="true"
            className="mx-auto w-56 rounded-md bg-white p-2"
            // SVG drawn on our server from the API's answer (no script, no link).
            dangerouslySetInnerHTML={{ __html: state.qrSvg }}
          />
          <p className="mt-4 text-sm text-ink-soft">{t("signIn.enrollManual")}</p>
          <p className="mt-1 break-all font-mono text-sm">{state.secret}</p>
        </div>
      )}
      <label className="mt-6 block font-semibold">
        {t("signIn.code")}
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className={`${field} font-mono text-2xl tracking-[0.3em]`}
        />
      </label>
      <ErrorLine message={state.error} />
      <button type="submit" disabled={pending} className={button}>
        {t("signIn.confirm")}
      </button>
    </form>
  );
}
