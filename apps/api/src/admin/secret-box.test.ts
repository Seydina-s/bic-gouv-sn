import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SecretBox } from "./secret-box";

const key = () => randomBytes(32).toString("base64");

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
    const [iv, tag, data] = sealed.split(".");
    const flipped = `${iv ?? ""}.${tag ?? ""}.${(data ?? "").replace(/^./, (c) => (c === "A" ? "B" : "A"))}`;
    expect(box.open(flipped)).toBeNull();
    expect(new SecretBox(key()).open(sealed)).toBeNull();
    expect(box.open("not-sealed")).toBeNull();
  });

  it("requires a 32-byte key", () => {
    expect(() => new SecretBox(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
