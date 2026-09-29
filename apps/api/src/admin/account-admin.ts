import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword, isLocked, NO_ATTEMPTS, passwordProblem, type Role } from "@bgs/admin-auth";
import type { AccountState, AccountView, Activation, ErrorCode } from "@bgs/shared-types";
import type { AdminAccount, AdminAccountStore } from "./account-store";
import type { AuditJournal } from "./audit-journal";
import type { AdminSignIn } from "./sign-in-service";

/** How long an activation link works: a weekend, not a month. */
export const ACTIVATION_MS = 72 * 60 * 60 * 1000;

/** A rule of account management was not met; the code explains it in the console. */
export class AccountRuleError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "AccountRuleError";
  }
}

export interface NewAccount {
  name: string;
  email: string;
  role: Role;
}

export interface AccountAdminDependencies {
  accounts: AdminAccountStore;
  journal: AuditJournal;
  signIn: AdminSignIn;
  now?: () => number;
}

/** Only the fingerprint of a code is kept: the file alone never activates an account. */
function fingerprint(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function stateOf(account: AdminAccount): AccountState {
  if (account.disabled) {
    return "disabled";
  }
  if (account.passwordHash === null) {
    return account.totp.enrolledAt === null ? "invited" : "password-reset";
  }
  return account.totp.enrolledAt === null ? "no-second-factor" : "active";
}

/** What the console shows of an account: never a password, hash or secret. */
export function accountView(account: AdminAccount, now: number): AccountView {
  const activationExpiresAt =
    account.passwordHash === null ? (account.activation?.expiresAt ?? null) : null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    state: stateOf(account),
    createdAt: account.createdAt,
    activationExpiresAt,
    activationExpired: activationExpiresAt !== null && Date.parse(activationExpiresAt) <= now,
    locked: isLocked(account.attempts, now),
  };
}

const NO_SECOND_FACTOR: AdminAccount["totp"] = {
  sealedSecret: null,
  enrolledAt: null,
  lastStep: null,
};

/**
 * The administration team's accounts, managed by administrators (ADM-10): create
 * one (its person chooses a password through a one-time activation link), change
 * a role, disable or enable, reset the second factor. Nobody acts on their own
 * account, so an active administrator always remains. Every change is journaled.
 */
export class AccountAdmin {
  private readonly now: () => number;

  constructor(private readonly deps: AccountAdminDependencies) {
    this.now = deps.now ?? Date.now;
  }

  async list(): Promise<AccountView[]> {
    const now = this.now();
    return (await this.deps.accounts.list()).map((account) => accountView(account, now));
  }

  async create(actorId: string, input: NewAccount): Promise<Activation> {
    const now = this.now();
    const { code, activation } = this.newActivation(now);
    const account: AdminAccount = {
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: null,
      activation,
      totp: NO_SECOND_FACTOR,
      attempts: NO_ATTEMPTS,
      disabled: false,
      createdAt: new Date(now).toISOString(),
    };
    if (!(await this.deps.accounts.add(account))) {
      throw new AccountRuleError("ACCOUNT_EMAIL_TAKEN");
    }
    await this.audit(actorId, "account.created", account.id, { role: account.role });
    return { account: accountView(account, now), code, expiresAt: activation.expiresAt };
  }

  async changeRole(actorId: string, id: string, role: Role): Promise<AccountView> {
    const { before, after } = await this.changeOther(actorId, id, (account) => ({
      ...account,
      role,
    }));
    if (before.role !== role) {
      await this.audit(actorId, "account.role-changed", id, { from: before.role, to: role });
    }
    return accountView(after, this.now());
  }

  async setDisabled(actorId: string, id: string, disabled: boolean): Promise<AccountView> {
    const { after: updated } = await this.changeOther(actorId, id, (account) => ({
      ...account,
      disabled,
    }));
    if (disabled) {
      await this.deps.signIn.endSessionsOf(id);
    }
    await this.audit(actorId, disabled ? "account.disabled" : "account.enabled", id);
    return accountView(updated, this.now());
  }

  /** A lost phone: the next sign-in sets up a new second factor (after the password). */
  async resetSecondFactor(actorId: string, id: string): Promise<AccountView> {
    const { after: updated } = await this.changeOther(actorId, id, (account) => ({
      ...account,
      totp: NO_SECOND_FACTOR,
    }));
    await this.deps.signIn.endSessionsOf(id);
    await this.audit(actorId, "account.second-factor-reset", id);
    return accountView(updated, this.now());
  }

  /** A new link for an account not activated yet (the previous one stops working). */
  async renewActivation(actorId: string, id: string): Promise<Activation> {
    const now = this.now();
    const { code, activation } = this.newActivation(now);
    const { after: updated } = await this.changeOther(actorId, id, (account) => {
      if (account.passwordHash !== null) {
        throw new AccountRuleError("ACCOUNT_ALREADY_ACTIVE");
      }
      return { ...account, activation };
    });
    await this.audit(actorId, "account.activation-renewed", id);
    return { account: accountView(updated, now), code, expiresAt: activation.expiresAt };
  }

  /**
   * A forgotten password (ADM-11): the old one stops working, the sessions close,
   * and a new activation link lets the person choose another. The second factor
   * stays: whoever holds the link still needs the person's phone to sign in.
   */
  async resetPassword(actorId: string, id: string): Promise<Activation> {
    const now = this.now();
    const { code, activation } = this.newActivation(now);
    const { after: updated } = await this.changeOther(actorId, id, (account) => ({
      ...account,
      passwordHash: null,
      activation,
      attempts: NO_ATTEMPTS,
    }));
    await this.deps.signIn.endSessionsOf(id);
    await this.audit(actorId, "account.password-reset", id);
    return { account: accountView(updated, now), code, expiresAt: activation.expiresAt };
  }

  /** The person chooses a password with the link; the link then stops working. */
  async activate(code: string, password: string): Promise<void> {
    const now = this.now();
    const codeHash = fingerprint(code);
    const account = (await this.deps.accounts.list()).find(
      (candidate) => candidate.activation?.codeHash === codeHash,
    );
    const expiresAt = account?.activation?.expiresAt;
    if (
      account === undefined ||
      expiresAt === undefined ||
      account.disabled ||
      account.passwordHash !== null ||
      Date.parse(expiresAt) <= now
    ) {
      throw new AccountRuleError("ACCOUNT_ACTIVATION_INVALID");
    }
    if (passwordProblem(password) !== null) {
      throw new AccountRuleError("ACCOUNT_PASSWORD_REJECTED");
    }
    const passwordHash = await hashPassword(password);
    const updated = await this.deps.accounts.update(account.id, (current) => {
      // Used or renewed while the password was being hashed.
      if (current.activation?.codeHash !== codeHash || current.passwordHash !== null) {
        throw new AccountRuleError("ACCOUNT_ACTIVATION_INVALID");
      }
      return { ...current, passwordHash, activation: null, attempts: NO_ATTEMPTS };
    });
    if (updated === null) {
      throw new AccountRuleError("ACCOUNT_ACTIVATION_INVALID");
    }
    await this.audit(account.id, "account.activated", account.id);
  }

  private newActivation(now: number) {
    const code = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now + ACTIVATION_MS).toISOString();
    return { code, activation: { codeHash: fingerprint(code), expiresAt } };
  }

  /** Changes someone else's account; one's own is refused. */
  private async changeOther(
    actorId: string,
    id: string,
    change: (account: AdminAccount) => AdminAccount,
  ): Promise<{ before: AdminAccount; after: AdminAccount }> {
    if (actorId === id) {
      throw new AccountRuleError("ACCOUNT_SELF");
    }
    const seen: { before?: AdminAccount } = {};
    const after = await this.deps.accounts.update(id, (account, all) => {
      // Checked again at the moment of writing: two administrators removing each
      // other's rights at the same instant would otherwise leave none.
      const actor = all.find((candidate) => candidate.id === actorId);
      if (actor?.role !== "admin" || actor.disabled) {
        throw new AccountRuleError("ADMIN_FORBIDDEN");
      }
      seen.before = account;
      return change(account);
    });
    if (after === null || seen.before === undefined) {
      throw new AccountRuleError("ACCOUNT_NOT_FOUND");
    }
    return { before: seen.before, after };
  }

  private async audit(
    actor: string,
    action: string,
    target: string,
    details: Record<string, string | null> = {},
  ): Promise<void> {
    await this.deps.journal.append({
      at: new Date(this.now()).toISOString(),
      actor,
      action,
      target,
      details,
    });
  }
}
