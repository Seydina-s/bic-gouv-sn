import { randomBytes, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32Decode, codeAt, hashPassword, timeStep, type Role } from "@bgs/admin-auth";
import { FileAdminAccountStore } from "../admin/account-store";
import { FileAuditJournal } from "../admin/audit-journal";
import { SecretBox } from "../admin/secret-box";
import { AdminSignIn } from "../admin/sign-in-service";

const PASSWORD = "une phrase de passe de test";

/** Admin services on temporary files, and a way to sign an account in (tests only). */
export async function adminForTests() {
  const dir = join(tmpdir(), "bgs-admin-tests", randomUUID());
  const accounts = new FileAdminAccountStore(join(dir, "accounts.json"));
  const journal = new FileAuditJournal(join(dir, "audit.jsonl"));
  const signIn = new AdminSignIn({
    accounts,
    journal,
    box: new SecretBox(randomBytes(32).toString("base64")),
  });
  const passwordHash = await hashPassword(PASSWORD);

  /** A new account of this role, signed in: returns its session token. */
  async function tokenFor(role: Role): Promise<string> {
    const email = `${role}-${randomUUID()}@bic.test`;
    await accounts.save({
      id: randomUUID(),
      email,
      name: role,
      role,
      passwordHash,
      totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
      attempts: { failures: [], lockedUntil: null },
      disabled: false,
      createdAt: new Date().toISOString(),
    });
    const step = await signIn.checkPassword(email, PASSWORD);
    const key = step.kind === "enroll" ? base32Decode(step.secret) : null;
    if (step.kind !== "enroll" || key === null) {
      throw new Error("test sign-in failed");
    }
    const done = await signIn.checkCode(step.challenge, codeAt(key, timeStep(Date.now())));
    if (done.kind !== "signed-in") {
      throw new Error("test sign-in failed");
    }
    return done.token;
  }

  return { admin: { signIn, journal }, journal, tokenFor };
}
