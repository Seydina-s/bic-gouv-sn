import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SecretBox } from "./secret-box";

const key = () => randomBytes(32).toString("base64");

/** A text sealed the way it was before key fingerprints ("iv.tag.ciphertext"). */
function legacySeal(keyBase64: string, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyBase64, "base64"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

describe("SecretBox", () => {
  it("opens what it sealed, with a fresh nonce each time", () => {
    const box = new SecretBox(key());
    const sealed = box.seal("JBSWY3DPEHPK3PXP");
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(box.open(sealed)).toBe("JBSWY3DPEHPK3PXP");
    expect(box.seal("JBSWY3DPEHPK3PXP")).not.toBe(sealed);
  });

  it("refuses an altered text, another key and a malformed text", () => {
    const box = new SecretBox(key());
    const sealed = box.seal("secret");
    const parts = sealed.split(".");
    const data = parts[4] ?? "";
    const flipped = [...parts.slice(0, 4), data.replace(/^./, (c) => (c === "A" ? "B" : "A"))];
    expect(box.open(flipped.join("."))).toBeNull();
    expect(new SecretBox(key()).open(sealed)).toBeNull();
    expect(box.open("not-sealed")).toBeNull();
  });

  it("requires a 32-byte key", () => {
    expect(() => new SecretBox(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });

  it("names its key by a short fingerprint, never by the key itself", () => {
    const secretKey = key();
    const box = new SecretBox(secretKey);
    expect(box.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(box.seal("secret")).toContain(`.${box.fingerprint}.`);
    expect(box.seal("secret")).not.toContain(secretKey);
  });

  it("still opens with a previous key, and says what must be sealed again", () => {
    const oldKey = key();
    const sealedBefore = new SecretBox(oldKey).seal("secret");
    const legacy = legacySeal(oldKey, "legacy");
    const box = new SecretBox(key(), [oldKey]);
    expect(box.open(sealedBefore)).toBe("secret");
    expect(box.open(legacy)).toBe("legacy");
    expect(box.isCurrent(sealedBefore)).toBe(false);
    expect(box.isCurrent(legacy)).toBe(false);
    expect(box.isCurrent(box.seal("secret"))).toBe(true);
    // Once the old key is dropped, what it sealed can no longer be opened.
    expect(new SecretBox(key()).open(sealedBefore)).toBeNull();
  });
});
