import { randomUUID } from "node:crypto";
import { accountsResponseSchema, type AccountState, type AccountView } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import {
  AccessForm,
  CreateAccountForm,
  RenewActivationForm,
  ResetSecondFactorForm,
  RoleForm,
} from "./AccountForms";

export const dynamic = "force-dynamic";

/** Each state in words and colour: green when all is set, yellow while waiting. */
const STATE_STYLE: Record<AccountState, string> = {
  active: "bg-primary-container text-on-primary-container",
  invited: "bg-accent-container text-on-accent-container",
  "no-second-factor": "bg-accent-container text-on-accent-container",
  disabled: "bg-surface text-ink-soft",
};

function linkLine(account: AccountView): string | null {
  if (account.activationExpiresAt === null) {
    return null;
  }
  const until = new Date(account.activationExpiresAt);
  return account.activationExpired
    ? t("accounts.linkExpired")
    : t("accounts.linkUntil", { day: formatDay(until), time: formatClockTime(until) });
}

/** What an administrator can do with someone else's account, given where it stands. */
function AccountActions({ account }: { account: AccountView }) {
  return (
    <div className="space-y-5 pt-3">
      {account.state !== "disabled" && (
        <RoleForm id={account.id} name={account.name} role={account.role} />
      )}
      {account.state === "active" && <ResetSecondFactorForm id={account.id} />}
      <div className="flex flex-wrap items-start gap-3">
        {account.state === "invited" && (
          <RenewActivationForm id={account.id} idempotencyKey={randomUUID()} />
        )}
        <AccessForm id={account.id} disabled={account.state === "disabled"} />
      </div>
    </div>
  );
}

/**
 * The team's accounts (ADM-10), for administrators: add a person (who chooses a
 * password through a one-time link), change a role, disable, reset a second
 * factor. Nobody changes their own account; every action is in the audit journal.
 */
export default async function AccountsPage() {
  const { token, account: me } = await requireAccount();
  const result = await adminRequest({ path: "/accounts", token, schema: accountsResponseSchema });
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {result.status === 403 ? t("accounts.adminsOnly") : t("accounts.failed")}
      </p>
    );
  }
  return (
    <section aria-labelledby="accounts-title" className="space-y-10">
      <div className="space-y-4">
        <h1 id="accounts-title" className="font-display text-3xl font-extrabold tracking-tight">
          {t("accounts.title")}
        </h1>
        <p className="max-w-prose text-ink-soft">{t("accounts.intro")}</p>
        <p className="max-w-prose text-ink-soft">{t("accounts.selfRule")}</p>
      </div>

      <section aria-labelledby="team-title" className="space-y-4">
        <h2 id="team-title" className="font-display text-2xl font-bold">
          {t("accounts.listTitle")}
        </h2>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {result.data.accounts.map((account) => {
            const mine = account.id === me.id;
            const link = linkLine(account);
            return (
              <li key={account.id} className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-lg font-bold leading-snug">{account.name}</p>
                  {mine && (
                    <span className="rounded-full border border-line-strong px-3 py-0.5 text-sm font-semibold">
                      {t("accounts.you")}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-0.5 text-sm font-semibold ${STATE_STYLE[account.state]}`}
                  >
                    {t(`accounts.states.${account.state}`)}
                  </span>
                </div>
                <p className="break-all text-ink-soft">{account.email}</p>
                <p className="text-sm text-ink-soft">
                  {t(`accounts.roles.${account.role}`)} ·{" "}
                  {t("accounts.since", { day: formatDay(new Date(account.createdAt)) })}
                </p>
                {link !== null && <p className="text-sm font-semibold">{link}</p>}
                {account.locked && <p className="text-sm font-semibold">{t("accounts.locked")}</p>}
                {!mine && <AccountActions account={account} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="create-title" className="space-y-4">
        <h2 id="create-title" className="font-display text-2xl font-bold">
          {t("accounts.createTitle")}
        </h2>
        <CreateAccountForm idempotencyKey={randomUUID()} />
      </section>
    </section>
  );
}
