import { createHash, randomBytes } from "node:crypto";
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
  SESSION_MAX_MS,
  touchSession,
  verifyPassword,
  type Role,
  type Session,
} from "@bgs/admin-auth";
import { z } from "zod";
import { MemoryKeyValueStore, type KeyValueStore } from "../shared-state/key-value-store";
import type { AdminAccount, AdminAccountStore } from "./account-store";
import type { AuditJournal } from "./audit-journal";
import type { SecretBox } from "./secret-box";

/** Time allowed between the password and the code. */
const CHALLENGE_MS = 5 * 60 * 1000;
/** Wrong codes allowed per challenge before the password must be typed again. */
const CODES_PER_CHALLENGE = 5;
const ISSUER = "Bic Gouv SN";
/** How long failed attempts on an unknown address are remembered. */
const UNKNOWN_ATTEMPTS_MS = 24 * 60 * 60 * 1000;

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

export interface SignInDependencies {
  accounts: AdminAccountStore;
  journal: AuditJournal;
  box: SecretBox;
  /** Sessions and sign-in steps, shared by the API instances (SCALE-01). */
  state?: KeyValueStore;
  now?: () => number;
}

/** "seydina@gmail.com" → "sey…(7)@gmail.com": enough to spot a typo, not to read it. */
export function maskAddress(address: string): string {
  const at = address.lastIndexOf("@");
  const local = at === -1 ? address : address.slice(0, at);
  const domain = at === -1 ? "" : address.slice(at);
  return `${local.slice(0, 3)}…(${String(local.length)})${domain}`;
}

function publicAccount(account: AdminAccount): SignedInAccount {
  return { id: account.id, email: account.email, name: account.name, role: account.role };
}

/** Keys of the shared state; an address is only kept as a fingerprint. */
const keys = {
  challenge: (id: string) => `sign-in:challenge:${id}`,
  session: (tokenHash: string) => `sign-in:session:${tokenHash}`,
  sessionsOf: (accountId: string) => `sign-in:sessions-of:${accountId}`,
  unknown: (address: string) =>
    `sign-in:unknown:${createHash("sha256").update(address).digest("hex")}`,
};

const challengeSchema = z.object({
  accountId: z.string(),
  expiresAt: z.number(),
  codesLeft: z.int(),
  /** First sign-in: the new secret, sealed, kept until a code proves it works. */
  sealedPendingSecret: z.string().nullable(),
});
/** One sign-in step between the password and the code. */
type Challenge = z.infer<typeof challengeSchema>;

const sessionSchema = z.object({
  tokenHash: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
});
const attemptsSchema = z.object({
  failures: z.array(z.number()),
  lockedUntil: z.number().nullable(),
});

/** What the shared state holds, validated (it crosses a boundary): null if absent or damaged. */
function parse<S extends z.ZodType>(schema: S, raw: string | null): z.infer<S> | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Two-step sign-in of the administration team: password, then a one-time code from
 * an authenticator app (set up at the first sign-in). Sessions and sign-in steps
 * live in the shared state (SCALE-01): in memory for a single instance, in Redis
 * when several run, so a session opened on one works on all. Every outcome is
 * written to the audit journal.
 */
export class AdminSignIn {
  private decoyHash: Promise<string> | null = null;
  private readonly now: () => number;
  private readonly state: KeyValueStore;

  constructor(private readonly deps: SignInDependencies) {
    this.now = deps.now ?? Date.now;
    this.state = deps.state ?? new MemoryKeyValueStore();
  }

  async checkPassword(email: string, password: string): Promise<PasswordStep> {
    const now = this.now();
    const key = email.trim().toLowerCase();
    const account = await this.deps.accounts.findByEmail(key);
    if (account === null || account.disabled) {
      return this.refuseUnknown(key, password, now);
    }
    // Not activated yet (no password chosen): answered like an unknown address.
    if (account.passwordHash === null) {
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
    await this.saveChallenge(challenge, {
      accountId: account.id,
      expiresAt: now + CHALLENGE_MS,
      codesLeft: CODES_PER_CHALLENGE,
      // Never in clear in the shared state: sealed like the stored secrets.
      sealedPendingSecret: pendingSecret === null ? null : this.deps.box.seal(pendingSecret),
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
    const challenge = parse(challengeSchema, await this.state.get(keys.challenge(challengeId)));
    if (challenge === null || now > challenge.expiresAt) {
      await this.state.delete(keys.challenge(challengeId));
      return { kind: "expired" };
    }
    const account = await this.deps.accounts.get(challenge.accountId);
    if (account === null || account.disabled) {
      await this.state.delete(keys.challenge(challengeId));
      return { kind: "failed" };
    }
    if (isLocked(account.attempts, now)) {
      await this.state.delete(keys.challenge(challengeId));
      return { kind: "locked" };
    }
    const pendingSecret =
      challenge.sealedPendingSecret === null
        ? null
        : this.deps.box.open(challenge.sealedPendingSecret);
    const secret =
      pendingSecret ??
      (account.totp.sealedSecret === null ? null : this.deps.box.open(account.totp.sealedSecret));
    const step = secret === null ? null : matchTotp(secret, code, now);
    const lastStep = account.totp.lastStep;
    if (step === null || (lastStep !== null && step <= lastStep)) {
      const codesLeft = challenge.codesLeft - 1;
      if (codesLeft <= 0) {
        await this.state.delete(keys.challenge(challengeId));
      } else {
        await this.saveChallenge(challengeId, { ...challenge, codesLeft }, now);
      }
      const outcome = await this.recordFailedStep(account, now, "sign-in.code-failed");
      return outcome.kind === "locked" ? outcome : { kind: "failed" };
    }
    await this.state.delete(keys.challenge(challengeId));
    const firstTime = pendingSecret !== null;
    const stored = account.totp.sealedSecret;
    // Sealed with a key since replaced: sealed again with the current one (SEC-05).
    const reseal = firstTime || stored === null || !this.deps.box.isCurrent(stored);
    await this.deps.accounts.update(account.id, (current) => ({
      ...current,
      totp: {
        sealedSecret: reseal ? this.deps.box.seal(secret ?? "") : stored,
        enrolledAt: account.totp.enrolledAt ?? new Date(now).toISOString(),
        lastStep: step,
      },
      attempts: recordSuccess(),
    }));
    const { token, session } = openSession(account.id, now);
    await this.saveSession(session);
    await this.state.addToSet(keys.sessionsOf(account.id), session.tokenHash, SESSION_MAX_MS);
    await this.audit(account.id, "sign-in", { secondFactorSetUp: firstTime });
    return { kind: "signed-in", token, account: publicAccount(account) };
  }

  /** The account behind a session token, or null when absent, expired or disabled. */
  async whoIs(token: string): Promise<SignedInAccount | null> {
    const now = this.now();
    const tokenHash = hashToken(token);
    const session = parse(sessionSchema, await this.state.get(keys.session(tokenHash)));
    if (session === null || !isSessionAlive(session, now)) {
      await this.state.delete(keys.session(tokenHash));
      return null;
    }
    const account = await this.deps.accounts.get(session.userId);
    if (account === null || account.disabled) {
      await this.state.delete(keys.session(tokenHash));
      return null;
    }
    await this.saveSession(touchSession(session, now));
    return publicAccount(account);
  }

  /** Closes every session of an account (disabled, password or second factor reset). */
  async endSessionsOf(accountId: string): Promise<void> {
    for (const tokenHash of await this.state.membersOf(keys.sessionsOf(accountId))) {
      await this.state.delete(keys.session(tokenHash));
    }
    await this.state.delete(keys.sessionsOf(accountId));
  }

  async signOut(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const session = parse(sessionSchema, await this.state.get(keys.session(tokenHash)));
    await this.state.delete(keys.session(tokenHash));
    if (session !== null) {
      await this.audit(session.userId, "sign-out");
    }
  }

  /** A step lives until it expires (5 min), whatever the clock of this instance says. */
  private async saveChallenge(id: string, challenge: Challenge, now = this.now()): Promise<void> {
    await this.state.set(
      keys.challenge(id),
      JSON.stringify(challenge),
      Math.max(1, challenge.expiresAt - now),
    );
  }

  /** Kept for the longest a session can live; its own rules end it sooner. */
  private async saveSession(session: Session): Promise<void> {
    await this.state.set(keys.session(session.tokenHash), JSON.stringify(session), SESSION_MAX_MS);
  }

  /** Same work and same answer as a wrong password: addresses cannot be probed. */
  private async refuseUnknown(key: string, password: string, now: number): Promise<PasswordStep> {
    this.decoyHash ??= hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(password, await this.decoyHash);
    const previous = parse(attemptsSchema, await this.state.get(keys.unknown(key))) ?? NO_ATTEMPTS;
    const state = recordFailure(previous, now);
    await this.state.set(keys.unknown(key), JSON.stringify(state), UNKNOWN_ATTEMPTS_MS);
    const locked = isLocked(state, now);
    // Journaled with a masked address: a typo at account creation, or someone trying
    // addresses at random, becomes visible without exposing who was typed.
    await this.audit(
      "unknown",
      locked ? "sign-in.unknown-address-locked" : "sign-in.unknown-address",
      {
        address: maskAddress(key),
      },
    );
    return locked ? { kind: "locked" } : { kind: "failed" };
  }

  private async recordFailedStep(
    account: AdminAccount,
    now: number,
    action: string,
  ): Promise<{ kind: "failed" } | { kind: "locked" }> {
    const updated = await this.deps.accounts.update(account.id, (current) => ({
      ...current,
      attempts: recordFailure(current.attempts, now),
    }));
    const locked = updated !== null && isLocked(updated.attempts, now);
    await this.audit(account.id, locked ? "sign-in.locked" : action);
    return locked ? { kind: "locked" } : { kind: "failed" };
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
