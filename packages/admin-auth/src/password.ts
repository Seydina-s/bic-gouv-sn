import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * scrypt parameters (OWASP Password Storage Cheat Sheet: N = 2^17, r = 8, p = 1).
 * Stored with each hash, so they can be raised later without breaking old hashes.
 */
const COST = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
/** 128 × N × r bytes are needed; the default ceiling (32 MB) is too low for N = 2^17. */
const MAX_MEMORY = 256 * 1024 * 1024;

/** Passphrases are encouraged: long minimum, generous maximum (bounded hashing time). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordProblem = "too-short" | "too-long";

/** Why a new password is refused, or null when acceptable. */
export function passwordProblem(password: string): PasswordProblem | null {
  // Counted as a person sees them: an accented letter or an emoji is one character.
  const length = [...new Intl.Segmenter("fr").segment(password)].length;
  if (length < PASSWORD_MIN_LENGTH) {
    return "too-short";
  }
  if (length > PASSWORD_MAX_LENGTH) {
    return "too-long";
  }
  return null;
}

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFC"), salt, KEY_LENGTH, options, (error, key) => {
      if (error === null) {
        resolve(key);
      } else {
        reject(error);
      }
    });
  });
}

/** "scrypt$N$r$p$salt$hash" (base64url), self-describing. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, { ...COST, maxmem: MAX_MEMORY });
  return [
    "scrypt",
    COST.N,
    COST.r,
    COST.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/** Constant-time check; a malformed stored hash never matches (and never throws). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || salt === undefined || key === undefined) {
    return false;
  }
  const expected = Buffer.from(key, "base64url");
  const cost = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Object.values(cost).every(Number.isSafeInteger) || expected.length !== KEY_LENGTH) {
    return false;
  }
  try {
    const actual = await derive(password, Buffer.from(salt, "base64url"), {
      ...cost,
      maxmem: MAX_MEMORY,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
