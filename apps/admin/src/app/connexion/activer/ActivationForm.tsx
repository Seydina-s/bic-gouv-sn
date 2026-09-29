"use client";

import Link from "next/link";
import { useActionState } from "react";
import { field, primaryButton } from "../../../lib/form-styles";
import { t } from "../../../lib/i18n";
import { activateAccount, type ActivationState } from "./actions";

/**
 * Password twice; the activation code is read from the link's "#" part only when
 * the form is sent, so it never appears in an address a server receives.
 */
export function ActivationForm() {
  const [state, action, pending] = useActionState<ActivationState, FormData>(activateAccount, {
    done: false,
  });

  if (state.done) {
    return (
      <div className="mt-8 space-y-6">
        <p
          role="status"
          className="rounded-md bg-primary-container px-4 py-3 text-on-primary-container"
        >
          {t("activation.done")}
        </p>
        <Link href="/connexion" className={primaryButton}>
          {t("activation.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={(form) => {
        form.set("code", window.location.hash.slice(1));
        action(form);
      }}
      className="mt-8 space-y-5"
    >
      <div className="space-y-2">
        <label htmlFor="password" className="block font-semibold">
          {t("activation.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className={field}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="passwordAgain" className="block font-semibold">
          {t("activation.passwordAgain")}
        </label>
        <input
          id="passwordAgain"
          name="passwordAgain"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className={field}
        />
      </div>
      {state.error !== undefined && (
        <p role="alert" className="rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {t("activation.submit")}
      </button>
    </form>
  );
}
