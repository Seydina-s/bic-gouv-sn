import { describe, expect, it } from "vitest";
import { chainEntry, firstBrokenEntry, type AuditEntry } from "./audit-log";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { can, isRole } from "./roles";
import { hashToken, isSessionAlive, openSession, SESSION_IDLE_MS, touchSession } from "./session";
import { isLocked, LOCK_MS, NO_ATTEMPTS, recordFailure, recordSuccess } from "./throttle";
import {
  base32Decode,
  base32Encode,
  codeAt,
  generateTotpSecret,
  matchTotp,
  otpauthUri,
  timeStep,
} from "./totp";

describe("passwords", () => {
  it("verifies the right password only, with a fresh salt each time", async () => {
    const hash = await hashPassword("une phrase de passe assez longue");
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(await verifyPassword("une phrase de passe assez longue", hash)).toBe(true);
    expect(await verifyPassword("une phrase de passe assez longuE", hash)).toBe(false);
    expect(await hashPassword("une phrase de passe assez longue")).not.toBe(hash);
  });

  it("never matches, nor throws, on a malformed stored hash", async () => {
    for (const stored of ["", "plain", "scrypt$x$8$1$abc$def", "bcrypt$1$2$3$4$5"]) {
      expect(await verifyPassword("peu importe ici", stored)).toBe(false);
    }
  });

  it("asks for passphrases of reasonable length", () => {
    expect(passwordProblem("court")).toBe("too-short");
    expect(passwordProblem("x".repeat(129))).toBe("too-long");
    expect(passwordProblem("baobab de Thiès 2026")).toBeNull();
  });
});

describe("second factor (TOTP)", () => {
  // RFC 6238, appendix B (SHA-1, 8 digits).
  const rfcSecret = Buffer.from("12345678901234567890");
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
  ])("gives the RFC code at %i s", (seconds, code) => {
    expect(codeAt(rfcSecret, timeStep(seconds * 1000), 8)).toBe(code);
  });

  it("encodes base32 as RFC 4648, and reads it back", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("mzxw 6ytb oi")?.toString()).toBe("foobar");
    expect(base32Decode("not base32!")).toBeNull();
  });

  it("accepts the current code and one step of clock drift, nothing else", () => {
    const secret = generateTotpSecret();
    const key = base32Decode(secret);
    const now = 1_790_000_000_000;
    const step = timeStep(now);
    if (key === null) {
      throw new Error("secret");
    }
    expect(matchTotp(secret, codeAt(key, step), now)).toBe(step);
    expect(matchTotp(secret, codeAt(key, step - 1), now)).toBe(step - 1);
    expect(matchTotp(secret, codeAt(key, step - 2), now)).toBeNull();
    expect(matchTotp(secret, "12345", now)).toBeNull();
    expect(matchTotp("!!", "123456", now)).toBeNull();
  });

  it("gives the address the authenticator apps scan", () => {
    expect(otpauthUri("Bic Gouv SN", "a@b.sn", "ABC")).toBe(
      "otpauth://totp/Bic%20Gouv%20SN:a%40b.sn?secret=ABC&issuer=Bic+Gouv+SN&algorithm=SHA1&digits=6&period=30",
    );
  });
});

describe("roles", () => {
  it("gives each role the tasks of the roles below it", () => {
    expect(can("reviewer", "procedures.review")).toBe(true);
    expect(can("reviewer", "notifications.send")).toBe(false);
    expect(can("editor", "notifications.send")).toBe(true);
    expect(can("editor", "users.manage")).toBe(false);
    expect(can("admin", "users.manage")).toBe(true);
    expect(isRole("admin")).toBe(true);
    expect(isRole("root")).toBe(false);
  });
});

describe("sessions", () => {
  it("stores only the hash of the token", () => {
    const { token, session } = openSession("u1", 0);
    expect(session.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(session)).not.toContain(token);
  });

  it("ends after 30 minutes idle and after 8 hours at most", () => {
    const { session } = openSession("u1", 0);
    expect(isSessionAlive(session, SESSION_IDLE_MS)).toBe(true);
    expect(isSessionAlive(session, SESSION_IDLE_MS + 1)).toBe(false);
    let active = session;
    for (let at = 0; at <= 8 * 60 * 60 * 1000; at += 20 * 60 * 1000) {
      active = touchSession(active, at);
    }
    expect(isSessionAlive(active, 8 * 60 * 60 * 1000 + 1)).toBe(false);
  });
});

describe("sign-in throttling", () => {
  it("locks the account for 15 minutes after 5 failures, and clears on success", () => {
    let state = NO_ATTEMPTS;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      state = recordFailure(state, attempt * 1000);
    }
    expect(isLocked(state, 5000)).toBe(false);
    state = recordFailure(state, 5000);
    expect(isLocked(state, 5000 + LOCK_MS - 1)).toBe(true);
    expect(isLocked(state, 5000 + LOCK_MS)).toBe(false);
    expect(recordSuccess()).toEqual(NO_ATTEMPTS);
  });

  it("forgets failures older than the window", () => {
    let state = NO_ATTEMPTS;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      state = recordFailure(state, attempt * 16 * 60 * 1000);
    }
    expect(isLocked(state, 5 * 16 * 60 * 1000)).toBe(false);
  });
});

describe("audit journal", () => {
  const input = (action: string) => ({
    at: "2026-09-26T10:00:00Z",
    actor: "u1",
    action,
    target: "demarche-test",
    details: { theme: "Transports", batch: 3 },
  });

  it("chains each entry to the previous one and detects any change", () => {
    const entries: AuditEntry[] = [];
    for (const action of ["sign-in", "procedure.theme.validated", "sign-out"]) {
      entries.push(chainEntry(entries.at(-1) ?? null, input(action)));
    }
    expect(firstBrokenEntry(entries)).toBe(-1);
    const altered = entries.map((entry, index) =>
      index === 1 ? { ...entry, details: { ...entry.details, theme: "Santé" } } : entry,
    );
    expect(firstBrokenEntry(altered)).toBe(1);
    expect(firstBrokenEntry([entries[0], entries[2]].filter((e) => e !== undefined))).toBe(1);
  });
});
