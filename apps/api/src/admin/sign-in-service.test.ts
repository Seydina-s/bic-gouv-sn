import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32Decode, codeAt, hashPassword, timeStep } from "@bgs/admin-auth";
import { describe, expect, it } from "vitest";
import { FileAdminAccountStore } from "./account-store";
import { FileAuditJournal } from "./audit-journal";
import { newSecretKey } from "./key-rotation";
import { SecretBox } from "./secret-box";
import { AdminSignIn } from "./sign-in-service";

// Placeholder account and second-factor secret, never real ones.
const PASSWORD = "une phrase de passe de test";
const TOTP_SECRET = "JBSWY3DPEHPK3PXP";

describe("sign-in after the key was replaced", () => {
  it("still works, and seals the secret again with the new key", async () => {
    const oldKey = newSecretKey();
    const newKey = newSecretKey();
    const dir = join(tmpdir(), "bgs-sign-in", randomUUID());
    const accounts = new FileAdminAccountStore(join(dir, "accounts.json"));
    const id = randomUUID();
    await accounts.save({
      id,
      email: "relecteur@bic.test",
      name: "Relecteur de test",
      role: "reviewer",
      passwordHash: await hashPassword(PASSWORD),
      activation: null,
      totp: {
        sealedSecret: new SecretBox(oldKey).seal(TOTP_SECRET),
        enrolledAt: "2026-09-29T08:00:00.000Z",
        lastStep: null,
      },
      attempts: { failures: [], lockedUntil: null },
      disabled: false,
      createdAt: "2026-09-29T08:00:00.000Z",
    });
    const now = Date.parse("2026-09-29T12:00:00Z");
    const signIn = new AdminSignIn({
      accounts,
      journal: new FileAuditJournal(join(dir, "audit.jsonl")),
      box: new SecretBox(newKey, [oldKey]),
      now: () => now,
    });
    const step = await signIn.checkPassword("relecteur@bic.test", PASSWORD);
    if (step.kind !== "code") {
      throw new Error("expected the code step");
    }
    const code = codeAt(base32Decode(TOTP_SECRET) ?? Buffer.alloc(0), timeStep(now));
    expect((await signIn.checkCode(step.challenge, code)).kind).toBe("signed-in");
    const sealed = (await accounts.get(id))?.totp.sealedSecret ?? "";
    // The new key alone now opens it: the old key can be dropped.
    expect(new SecretBox(newKey).open(sealed)).toBe(TOTP_SECRET);
  });
});
