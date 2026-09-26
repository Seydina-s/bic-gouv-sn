import { randomBytes } from "node:crypto";
import {
  generateTotpSecret,
  hashPassword,
  hashToken,
  isLocked,
  isSessionAlive,
  matchTotp,
  NO_ATTEMPTS,
  openSession,
  otpauthUri,
  recordFailure,
  recordSuccess,
  touchSession,
  verifyPassword,
  type AttemptState,
  type Role,
  type Session,
} from "@bgs/admin-auth";
import type { AdminAccount, AdminAccountStore } from "./account-store";
import type { AuditJournal } from "./audit-journal";
import type { SecretBox } from "./secret-box";

/** Time allowed between the password and the code. */
const CHALLENGE_MS = 5 * 60 * 1000;
/** Wrong codes allowed per challenge before the password must be typed again. */
const CODES_PER_CHALLENGE = 5;
const ISSUER = "Bic Gouv SN";

export interface SignedInAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type PasswordStep =
  | { kind: "code"; challenge: string }
  | { kind: "enroll"; challenge: string; otpauthUri: string; secret: string }
  | { kind: "failed" }
  | { kind: "locked" };

export type CodeStep =
  | { kind: "signed-in"; token: string; account: SignedInAccount }
  | { kind: "failed" }
  | { kind: "expired" }
  | { kind: "locked" };

interface Challenge {
  accountId: string;
  expiresAt: number;
  codesLeft: number;
  /** First sign-in: the new secret, kept in memory until a code proves it works. */
  pendingSecret: string | null;
}

export interface SignInDependencies {
  accounts: AdminAccountStore;
  journal: AuditJournal;
  box: SecretBox;
  now?: () => number;
}

function publicAccount(account: AdminAccount): SignedInAccount {
  return { id: account.id, email: account.email, name: account.name, role: account.role };
}

/**
 * Two-step sign-in of the administration team: password, then a one-time code from
 * an authenticator app (set up at the first sign-in). Sessions and challenges live
 * in memory: a restart signs everyone out (safe default; shared store when the API
 * runs on several instances). Every outcome is written to the audit journal.
 */
export class AdminSignIn {
  private readonly challenges = new Map<string, Challenge>();
  private readonly sessions = new Map<string, Session>();
  /** Failed attempts on addresses without an account, so they lock like real ones. */
  private readonly unknownAttempts = new Map<string, AttemptState>();
  private decoyHash: Promise<string> | null = null;
  private readonly now: () => number;

  constructor(private readonly deps: SignInDependencies) {
    this.now = deps.now ?? Date.now;
  }

  async checkPassword(email: string, password: string): Promise<PasswordStep> {
    const now = this.now();
    const key = email.trim().toLowerCase();
    const account = await this.deps.accounts.findByEmail(key);
    if (account === null || account.disabled) {
      return this.refuseUnknown(key, password, now);
    }
    if (isLocked(account.attempts, now)) {
      await this.audit(account.id, "sign-in.locked");
      return { kind: "locked" };
    }
    if (!(await verifyPassword(password, account.passwordHash))) {
      return this.recordFailedStep(account, now, "sign-in.password-failed");
    }
    const challenge = randomBytes(32).toString("base64url");
    const enrolled = account.totp.enrolledAt !== null;
    const pendingSecret = enrolled ? null : generateTotpSecret();
    this.challenges.set(challenge, {
      accountId: account.id,
      expiresAt: now + CHALLENGE_MS,
      codesLeft: CODES_PER_CHALLENGE,
      pendingSecret,
    });
    if (pendingSecret === null) {
      return { kind: "code", challenge };
    }
    return {
      kind: "enroll",
      challenge,
      otpauthUri: otpauthUri(ISSUER, account.email, pendingSecret),
      secret: pendingSecret,
    };
  }

  async checkCode(challengeId: string, code: string): Promise<CodeStep> {
    const now = this.now();
    const challenge = this.challenges.get(challengeId);
    if (challenge === undefined || now > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return { kind: "expired" };
    }
    const account = await this.deps.accounts.get(challenge.accountId);
    if (account === null || account.disabled) {
      this.challenges.delete(challengeId);
      return { kind: "failed" };
    }
    if (isLocked(account.attempts, now)) {
      this.challenges.delete(challengeId);
      return { kind: "locked" };
    }
    const secret =
      challenge.pendingSecret ??
      (account.totp.sealedSecret === null ? null : this.deps.box.open(account.totp.sealedSecret));
    const step = secret === null ? null : matchTotp(secret, code, now);
    const lastStep = account.totp.lastStep;
    if (step === null || (lastStep !== null && step <= lastStep)) {
      challenge.codesLeft -= 1;
      if (challenge.codesLeft <= 0) {
        this.challenges.delete(challengeId);
      }
      const outcome = await this.recordFailedStep(account, now, "sign-in.code-failed");
      return outcome.kind === "locked" ? outcome : { kind: "failed" };
    }
    this.challenges.delete(challengeId);
    const firstTime = challenge.pendingSecret !== null;
    await this.deps.accounts.save({
      ...account,
      totp: {
        sealedSecret: firstTime ? this.deps.box.seal(secret ?? "") : account.totp.sealedSecret,
        enrolledAt: account.totp.enrolledAt ?? new Date(now).toISOString(),
        lastStep: step,
      },
      attempts: recordSuccess(),
    });
    const { token, session } = openSession(account.id, now);
    this.dropDeadSessions(now);
    this.sessions.set(session.tokenHash, session);
    await this.audit(account.id, "sign-in", { secondFactorSetUp: firstTime });
    return { kind: "signed-in", token, account: publicAccount(account) };
  }

  /** The account behind a session token, or null when absent, expired or disabled. */
  async whoIs(token: string): Promise<SignedInAccount | null> {
    const now = this.now();
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (session === undefined || !isSessionAlive(session, now)) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const account = await this.deps.accounts.get(session.userId);
    if (account === null || account.disabled) {
      this.sessions.delete(tokenHash);
      return null;
    }
    this.sessions.set(tokenHash, touchSession(session, now));
    return publicAccount(account);
  }

  async signOut(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    this.sessions.delete(tokenHash);
    if (session !== undefined) {
      await this.audit(session.userId, "sign-out");
    }
  }

  /** Same work and same answer as a wrong password: addresses cannot be probed. */
  private async refuseUnknown(key: string, password: string, now: number): Promise<PasswordStep> {
    this.decoyHash ??= hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(password, await this.decoyHash);
    const state = recordFailure(this.unknownAttempts.get(key) ?? NO_ATTEMPTS, now);
    this.unknownAttempts.set(key, state);
    return isLocked(state, now) ? { kind: "locked" } : { kind: "failed" };
  }

  private async recordFailedStep(
    account: AdminAccount,
    now: number,
    action: string,
  ): Promise<{ kind: "failed" } | { kind: "locked" }> {
    const attempts = recordFailure(account.attempts, now);
    await this.deps.accounts.save({ ...account, attempts });
    const locked = isLocked(attempts, now);
    await this.audit(account.id, locked ? "sign-in.locked" : action);
    return locked ? { kind: "locked" } : { kind: "failed" };
  }

  private dropDeadSessions(now: number): void {
    for (const [hash, session] of this.sessions) {
      if (!isSessionAlive(session, now)) {
        this.sessions.delete(hash);
      }
    }
  }

  private async audit(
    actor: string,
    action: string,
    details: Record<string, string | number | boolean | null> = {},
  ): Promise<void> {
    await this.deps.journal.append({
      at: new Date(this.now()).toISOString(),
      actor,
      action,
      target: null,
      details,
    });
  }
}
