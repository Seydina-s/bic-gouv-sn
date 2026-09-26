import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * Second factor: time-based one-time codes (RFC 6238, HMAC-SHA1, 6 digits, 30 s),
 * the format of Google Authenticator, Microsoft Authenticator, FreeOTP…
 */

const DIGITS = 6;
const STEP_SECONDS = 30;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32.charAt((value << (5 - bits)) & 31);
  }
  return output;
}

/** Null when the text is not base32 (spaces and case ignored, as apps display it). */
export function base32Decode(text: string): Buffer | null {
  const clean = text.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) {
      return null;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A new secret (160 bits, as RFC 4226 recommends), in base32 for the apps. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The time step a moment falls in. */
export function timeStep(nowMs: number): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/** The code for a time step (exported for the RFC test vectors). */
export function codeAt(secret: Buffer, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = (mac.at(-1) ?? 0) & 0x0f;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/**
 * The time step a code belongs to (±1 step of clock drift), or null when wrong.
 * Callers refuse a step already used: a code works once (replay protection).
 */
export function matchTotp(secretBase32: string, code: string, nowMs: number): number | null {
  const secret = base32Decode(secretBase32);
  const typed = code.replace(/\s+/g, "");
  if (secret === null || secret.length === 0 || !/^\d{6}$/.test(typed)) {
    return null;
  }
  const current = timeStep(nowMs);
  for (const step of [current, current - 1, current + 1]) {
    if (timingSafeEqual(Buffer.from(codeAt(secret, step)), Buffer.from(typed))) {
      return step;
    }
  }
  return null;
}

/** Address the authenticator apps read from a QR code. */
export function otpauthUri(issuer: string, account: string, secretBase32: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
