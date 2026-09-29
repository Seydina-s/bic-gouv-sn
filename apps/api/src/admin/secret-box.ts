import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
/** Current format: "v2.<key id>.<iv>.<tag>.<ciphertext>", the rest in base64url. */
const VERSION = "v2";

interface Key {
  /** A short fingerprint naming the key: 32 bits of its hash, never the key itself. */
  id: string;
  bytes: Buffer;
}

function keyFrom(keyBase64: string): Key {
  const bytes = Buffer.from(keyBase64, "base64");
  if (bytes.length !== 32) {
    throw new Error("ADMIN_SECRET_KEY must be 32 bytes, base64-encoded");
  }
  return { id: createHash("sha256").update(bytes).digest("hex").slice(0, 8), bytes };
}

function decrypt(key: Key, parts: readonly string[]): string | null {
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv === undefined || tag === undefined || data === undefined) {
    return null;
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key.bytes, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypts the second-factor secrets at rest (AES-256-GCM): a copy of the account
 * file alone does not let anyone generate valid codes. The keys come from the
 * environment (ADMIN_SECRET_KEY, 32 random bytes in base64), never from the code.
 *
 * Replaceable at any time (SEC-05): the current key seals, previous keys still
 * open what they sealed, and each sealed text names its key by a short
 * fingerprint. A key that leaked is replaced, the secrets are sealed again with
 * the new one (admin:rotate-key / admin:reseal), then the old key is dropped.
 */
export class SecretBox {
  private readonly current: Key;
  private readonly keys: Key[];

  constructor(keyBase64: string, previousKeysBase64: readonly string[] = []) {
    this.current = keyFrom(keyBase64);
    this.keys = [this.current, ...previousKeysBase64.map(keyFrom)];
  }

  /** Fingerprint of the current key: shown to people instead of the key. */
  get fingerprint(): string {
    return this.current.id;
  }

  seal(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.current.bytes, iv);
    const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const parts = [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url"));
    return [VERSION, this.current.id, ...parts].join(".");
  }

  /** Null when the text was altered or sealed with a key this box does not hold. */
  open(sealed: string): string | null {
    const parts = sealed.split(".");
    if (parts[0] === VERSION && parts.length === 5) {
      const key = this.keys.find((candidate) => candidate.id === parts[1]);
      return key === undefined ? null : decrypt(key, parts.slice(2));
    }
    // Written before key fingerprints (three parts): any of the keys may open it.
    if (parts.length === 3) {
      for (const key of this.keys) {
        const plain = decrypt(key, parts);
        if (plain !== null) {
          return plain;
        }
      }
    }
    return null;
  }

  /** True when the text is sealed with the current key (nothing to seal again). */
  isCurrent(sealed: string): boolean {
    return sealed.startsWith(`${VERSION}.${this.current.id}.`);
  }
}
