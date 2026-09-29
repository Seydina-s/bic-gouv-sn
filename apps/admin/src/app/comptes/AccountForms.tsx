"use client";

import type { AdminRole } from "@bgs/shared-types";
import { useActionState, useId, useState } from "react";
import { FormOutcome } from "../../components/FormOutcome";
import { IdempotencyKey } from "../../components/IdempotencyKey";
import { field, primaryButton, secondaryButton } from "../../lib/form-styles";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import {
  changeAccess,
  changeRole,
  createAccount,
  renewActivation,
  resetPassword,
  type AccountFormState,
} from "./actions";

const ROLES: readonly AdminRole[] = ["reviewer", "editor", "admin"];

/**
 * The activation link, shown once. The code travels after "#": browsers never send
 * that part to a server, so it stays out of every server's logs.
 */
function ActivationLink({ code, expiresAt }: { code: string; expiresAt: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/connexion/activer#${code}`;
  const until = new Date(expiresAt);
  return (
    <div className="space-y-2 rounded-md border border-line-strong p-4">
      <label htmlFor={id} className="block font-semibold">
        {t("accounts.linkLabel")}
      </label>
      <input
        id={id}
        readOnly
        value={link}
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        className={`${field} font-mono text-sm`}
      />
      <p className="text-sm text-ink-soft">
        {t("accounts.linkValidity", { day: formatDay(until), time: formatClockTime(until) })}
      </p>
      <button
        type="button"
        className={secondaryButton}
        onClick={() => {
          void navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
          });
        }}
      >
        {t("accounts.copy")}
      </button>
      <p role="status" className="text-sm font-semibold">
        {copied ? t("accounts.copied") : ""}
      </p>
    </div>
  );
}

function Outcome({ state }: { state: AccountFormState }) {
  return (
    <>
      <FormOutcome state={state} />
      {state.activation !== undefined && <ActivationLink {...state.activation} />}
    </>
  );
}

/** Adds a person: name, address typed twice, role explained in a line each. */
export function CreateAccountForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(createAccount, {});
  return (
    <form action={action} className="max-w-2xl space-y-5">
      <IdempotencyKey value={idempotencyKey} />
      <div className="space-y-2">
        <label htmlFor="name" className="block font-semibold">
          {t("accounts.name")}
        </label>
        <input id="name" name="name" required maxLength={120} className={field} />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="block font-semibold">
          {t("accounts.email")}
        </label>
        <input id="email" name="email" type="email" required autoComplete="off" className={field} />
      </div>
      <div className="space-y-2">
        <label htmlFor="emailAgain" className="block font-semibold">
          {t("accounts.emailAgain")}
        </label>
        <input
          id="emailAgain"
          name="emailAgain"
          type="email"
          required
          autoComplete="off"
          className={field}
        />
      </div>
      <fieldset className="space-y-3">
        <legend className="font-semibold">{t("accounts.role")}</legend>
        {ROLES.map((role) => (
          <label key={role} className="flex min-h-12 items-start gap-3">
            <input
              type="radio"
              name="role"
              value={role}
              required
              defaultChecked={role === "reviewer"}
              className="mt-1 size-5 accent-primary"
            />
            <span>
              <span className="block font-semibold">{t(`accounts.roles.${role}`)}</span>
              <span className="block text-sm text-ink-soft">{t(`accounts.roleHints.${role}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className={primaryButton}>
        {t("accounts.create")}
      </button>
      <Outcome state={state} />
    </form>
  );
}

/** Changes the role of someone else's account. */
export function RoleForm({ id, name, role }: { id: string; name: string; role: AdminRole }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(changeRole, {});
  const selectId = useId();
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={selectId} className="block text-sm font-semibold">
        {t("accounts.roleOf", { name })}
      </label>
      <div className="flex flex-wrap gap-3">
        <div className="w-full max-w-xs">
          <select id={selectId} name="role" defaultValue={role} className={field}>
            {ROLES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`accounts.roles.${choice}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={pending} className={secondaryButton}>
          {t("accounts.saveRole")}
        </button>
      </div>
      <Outcome state={state} />
    </form>
  );
}

/** Disable or enable an account. */
export function AccessForm({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(changeAccess, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="action"
        value={disabled ? "enable" : "disable"}
        disabled={pending}
        className={secondaryButton}
      >
        {t(disabled ? "accounts.enable" : "accounts.disable")}
      </button>
      <Outcome state={state} />
    </form>
  );
}

/** Reset the second factor, only once the person's identity has been checked. */
/** A sensitive action on someone's access: done only once their identity is checked. */
function IdentityCheckedForm({
  id,
  run,
  confirm,
  button,
  idempotencyKey,
  action: actionName,
}: {
  id: string;
  run: (previous: AccountFormState, form: FormData) => Promise<AccountFormState>;
  confirm: string;
  button: string;
  idempotencyKey?: string;
  action?: string;
}) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(run, {});
  const confirmId = useId();
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {actionName !== undefined && <input type="hidden" name="action" value={actionName} />}
      {idempotencyKey !== undefined && <IdempotencyKey value={idempotencyKey} />}
      <label htmlFor={confirmId} className="flex min-h-12 items-start gap-3 text-sm">
        <input
          id={confirmId}
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-0.5 size-5 accent-primary"
        />
        <span>{confirm}</span>
      </label>
      <button type="submit" disabled={pending} className={secondaryButton}>
        {button}
      </button>
      <Outcome state={state} />
    </form>
  );
}

/** Reset the second factor (a lost phone), once the person's identity is checked. */
export function ResetSecondFactorForm({ id }: { id: string }) {
  return (
    <IdentityCheckedForm
      id={id}
      run={changeAccess}
      action="reset-second-factor"
      confirm={t("accounts.resetConfirm")}
      button={t("accounts.resetSecondFactor")}
    />
  );
}

/** A forgotten password (ADM-11): a new link, once the person's identity is checked. */
export function ResetPasswordForm({ id, idempotencyKey }: { id: string; idempotencyKey: string }) {
  return (
    <IdentityCheckedForm
      id={id}
      run={resetPassword}
      idempotencyKey={idempotencyKey}
      confirm={t("accounts.resetPasswordConfirm")}
      button={t("accounts.resetPassword")}
    />
  );
}

/** A new activation link for an account not activated yet. */
export function RenewActivationForm({
  id,
  idempotencyKey,
}: {
  id: string;
  idempotencyKey: string;
}) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(renewActivation, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <IdempotencyKey value={idempotencyKey} />
      <button type="submit" disabled={pending} className={secondaryButton}>
        {t("accounts.renew")}
      </button>
      <Outcome state={state} />
    </form>
  );
}
