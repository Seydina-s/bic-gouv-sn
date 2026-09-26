import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Encrypts the second-factor secrets at rest (AES-256-GCM): a copy of the account
 * file alone does not let anyone generate valid codes. The key comes from the
 * environment (ADMIN_SECRET_KEY, 32 random bytes in base64), never from the code.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(keyBase64: string) {
    this.key = Buffer.from(keyBase64, "base64");
    if (this.key.length !== 32) {
      throw new Error("ADMIN_SECRET_KEY must be 32 bytes, base64-encoded");
    }
  }

  /** "iv.tag.ciphertext", base64url. */
  seal(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
  }

  /** Null when the text was altered or sealed with another key. */
  open(sealed: string): string | null {
    const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
    if (iv === undefined || tag === undefined || data === undefined) {
      return null;
    }
    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
      return null;
    }
  }
}
