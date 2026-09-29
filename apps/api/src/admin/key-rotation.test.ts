import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileAdminAccountStore, type AdminAccount } from "./account-store";
import { newSecretKey, resealAll, withEnvValue } from "./key-rotation";
import { SecretBox } from "./secret-box";

// Placeholder accounts, never real team members.
function account(sealedSecret: string | null): AdminAccount {
  return {
    id: randomUUID(),
    email: `${randomUUID()}@bic.test`,
    name: "Compte de test",
    role: "reviewer",
    passwordHash: "hash-de-test",
    activation: null,
    totp: {
      sealedSecret,
      enrolledAt: sealedSecret === null ? null : "2026-09-29T08:00:00.000Z",
      lastStep: null,
    },
    attempts: { failures: [], lockedUntil: null },
    disabled: false,
    createdAt: "2026-09-29T08:00:00.000Z",
  };
}

describe("replacing the key of the second-factor secrets", () => {
  it("seals every secret again with the new key, so the old one can go", async () => {
    const oldKey = newSecretKey();
    const newKey = newSecretKey();
    const store = new FileAdminAccountStore(join(tmpdir(), "bgs-rotation", `${randomUUID()}.json`));
    await store.save(account(new SecretBox(oldKey).seal("SECRET1")));
    await store.save(account(new SecretBox(oldKey).seal("SECRET2")));
    await store.save(account(null));
    const box = new SecretBox(newKey, [oldKey]);
    expect(await resealAll(store, box)).toEqual({ resealed: 2, unreadable: 0 });
    const withNewKeyOnly = new SecretBox(newKey);
    const secrets = (await store.list()).map((item) =>
      item.totp.sealedSecret === null ? null : withNewKeyOnly.open(item.totp.sealedSecret),
    );
    expect(secrets).toEqual(["SECRET1", "SECRET2", null]);
    // Already done: running it again changes nothing.
    expect(await resealAll(store, box)).toEqual({ resealed: 0, unreadable: 0 });
  });

  it("counts a secret no key can open, and leaves it as it was", async () => {
    const store = new FileAdminAccountStore(join(tmpdir(), "bgs-rotation", `${randomUUID()}.json`));
    const lost = new SecretBox(newSecretKey()).seal("SECRET");
    await store.save(account(lost));
    expect(await resealAll(store, new SecretBox(newSecretKey()))).toEqual({
      resealed: 0,
      unreadable: 1,
    });
    expect((await store.list())[0]?.totp.sealedSecret).toBe(lost);
  });
});

describe("env file lines", () => {
  const text = "HOST=0.0.0.0\nADMIN_SECRET_KEY=ancienne\nPORT=3100\n";

  it("replaces a variable in place and keeps the other lines", () => {
    expect(withEnvValue(text, "ADMIN_SECRET_KEY", "nouvelle")).toBe(
      "HOST=0.0.0.0\nADMIN_SECRET_KEY=nouvelle\nPORT=3100\n",
    );
  });

  it("adds a missing variable before the final line break, and removes one", () => {
    const added = withEnvValue(text, "ADMIN_SECRET_KEYS_PREVIOUS", "ancienne");
    expect(added).toBe(
      "HOST=0.0.0.0\nADMIN_SECRET_KEY=ancienne\nPORT=3100\nADMIN_SECRET_KEYS_PREVIOUS=ancienne\n",
    );
    expect(withEnvValue(added, "ADMIN_SECRET_KEYS_PREVIOUS", null)).toBe(text);
  });
});
