import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  base32Decode,
  codeAt,
  firstBrokenEntry,
  hashPassword,
  SESSION_IDLE_MS,
  timeStep,
} from "@bgs/admin-auth";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FileAdminAccountStore, type AdminAccount } from "../admin/account-store";
import { FileAuditJournal } from "../admin/audit-journal";
import { SecretBox } from "../admin/secret-box";
import { AdminSignIn } from "../admin/sign-in-service";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

const PASSWORD = "une phrase de passe de test";
let passwordHash: string;
let dir: string;
let now: number;
let app: FastifyInstance;
let accounts: FileAdminAccountStore;
let journal: FileAuditJournal;

// Hashing with production parameters is slow: done once for the whole file.
beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

function account(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    id: randomUUID(),
    email: "relecteur@bic.test",
    name: "Relecteur de test",
    role: "reviewer",
    passwordHash,
    totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
    attempts: { failures: [], lockedUntil: null },
    disabled: false,
    createdAt: "2026-09-26T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(async () => {
  dir = join(tmpdir(), "bgs-admin-tests", randomUUID());
  now = Date.parse("2026-09-26T12:00:00Z");
  accounts = new FileAdminAccountStore(join(dir, "accounts.json"));
  journal = new FileAuditJournal(join(dir, "audit.jsonl"));
  const signIn = new AdminSignIn({
    accounts,
    journal,
    box: new SecretBox(randomBytes(32).toString("base64")),
    now: () => now,
  });
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    adminSignIn: signIn,
  });
});

afterEach(async () => {
  await app.close();
});

const post = (url: string, payload: object) =>
  app.inject({ method: "POST", url: `/admin/v1/auth/${url}`, payload });

const me = (token: string) =>
  app.inject({
    method: "GET",
    url: "/admin/v1/auth/me",
    headers: { authorization: `Bearer ${token}` },
  });

/** Password step, then the code of the current 30 s window. */
async function signIn(secret?: string): Promise<{ token: string; secret: string }> {
  const first = (await post("password", { email: "relecteur@bic.test", password: PASSWORD })).json<{
    challenge: string;
    secret?: string;
  }>();
  // A first sign-in issues a new secret each time: use it when given.
  const used = first.secret ?? secret ?? "";
  const key = base32Decode(used);
  if (key === null) {
    throw new Error("secret");
  }
  const second = await post("code", {
    challenge: first.challenge,
    code: codeAt(key, timeStep(now)),
  });
  return { token: second.json<{ token: string }>().token, secret: used };
}

describe("admin sign-in", () => {
  it("is not served at all without a secret key", async () => {
    const plain = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent" }),
      version: "1.0.0",
      articles: temporaryStore(),
    });
    const response = await plain.inject({
      method: "POST",
      url: "/admin/v1/auth/password",
      payload: {},
    });
    expect(response.statusCode).toBe(404);
    await plain.close();
  });

  it("sets up the second factor at the first sign-in, then signs in and out", async () => {
    await accounts.save(account());
    const first = await post("password", { email: "Relecteur@BIC.test ", password: PASSWORD });
    expect(first.statusCode).toBe(200);
    expect(first.headers["cache-control"]).toBe("no-store");
    const enroll = first.json<{ step: string; otpauthUri: string; secret: string }>();
    expect(enroll.step).toBe("enroll");
    expect(enroll.otpauthUri).toContain("otpauth://totp/Bic%20Gouv%20SN:relecteur%40bic.test");

    now += 60_000;
    const { token, secret } = await signIn();
    const self = await me(token);
    expect(self.json()).toMatchObject({ email: "relecteur@bic.test", role: "reviewer" });

    // The secret is stored sealed, never in clear.
    const stored = await readFile(join(dir, "accounts.json"), "utf8");
    expect(stored).not.toContain(secret);
    expect((await accounts.findByEmail("relecteur@bic.test"))?.totp.enrolledAt).not.toBeNull();

    expect((await post("sign-out", {})).statusCode).toBe(204);
    await app.inject({
      method: "POST",
      url: "/admin/v1/auth/sign-out",
      headers: { authorization: `Bearer ${token}` },
    });
    expect((await me(token)).statusCode).toBe(401);
  });

  it("asks only for the code once the second factor is set up, and refuses a replayed code", async () => {
    await accounts.save(account());
    const { secret } = await signIn();
    const again = (
      await post("password", { email: "relecteur@bic.test", password: PASSWORD })
    ).json<{
      step: string;
      challenge: string;
    }>();
    expect(again.step).toBe("code");
    const key = base32Decode(secret);
    if (key === null) {
      throw new Error("secret");
    }
    const replay = await post("code", {
      challenge: again.challenge,
      code: codeAt(key, timeStep(now)),
    });
    expect(replay.statusCode).toBe(401);
    now += 30_000;
    const fresh = await post("code", {
      challenge: again.challenge,
      code: codeAt(key, timeStep(now)),
    });
    expect(fresh.statusCode).toBe(200);
  });

  it("answers the same for an unknown address and a wrong password", async () => {
    await accounts.save(account());
    const unknown = await post("password", { email: "personne@bic.test", password: PASSWORD });
    const wrong = await post("password", {
      email: "relecteur@bic.test",
      password: "pas le bon mot",
    });
    expect([unknown.statusCode, wrong.statusCode]).toEqual([401, 401]);
    expect(unknown.json<{ code: string }>().code).toBe(wrong.json<{ code: string }>().code);
  });

  it("locks the account after 5 failures, even with the right password afterwards", async () => {
    await accounts.save(account());
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await post("password", { email: "relecteur@bic.test", password: "pas le bon mot" });
    }
    const locked = await post("password", { email: "relecteur@bic.test", password: PASSWORD });
    expect(locked.statusCode).toBe(429);
    expect(locked.json<{ code: string }>().code).toBe("ADMIN_TOO_MANY_ATTEMPTS");
    now += 15 * 60 * 1000;
    expect(
      (await post("password", { email: "relecteur@bic.test", password: PASSWORD })).statusCode,
    ).toBe(200);
  });

  it("refuses a sign-in step older than 5 minutes", async () => {
    await accounts.save(account());
    const first = (
      await post("password", { email: "relecteur@bic.test", password: PASSWORD })
    ).json<{
      challenge: string;
      secret: string;
    }>();
    now += 5 * 60 * 1000 + 1;
    const key = base32Decode(first.secret);
    if (key === null) {
      throw new Error("secret");
    }
    const late = await post("code", {
      challenge: first.challenge,
      code: codeAt(key, timeStep(now)),
    });
    expect(late.json<{ code: string }>().code).toBe("ADMIN_SESSION_EXPIRED");
  });

  it("ends a session after 30 minutes without activity", async () => {
    await accounts.save(account());
    const { token } = await signIn();
    now += SESSION_IDLE_MS - 1;
    expect((await me(token)).statusCode).toBe(200);
    now += SESSION_IDLE_MS + 1;
    expect((await me(token)).statusCode).toBe(401);
  });

  it("closes the door to a disabled account", async () => {
    const reviewer = account();
    await accounts.save(reviewer);
    const { token } = await signIn();
    await accounts.save({ ...reviewer, disabled: true });
    expect((await me(token)).statusCode).toBe(401);
  });

  it("writes every step to an intact, chained audit journal", async () => {
    await accounts.save(account());
    await post("password", { email: "relecteur@bic.test", password: "pas le bon mot" });
    const { token } = await signIn();
    await app.inject({
      method: "POST",
      url: "/admin/v1/auth/sign-out",
      headers: { authorization: `Bearer ${token}` },
    });
    const entries = await journal.entries();
    expect(entries.map((entry) => entry.action)).toEqual([
      "sign-in.password-failed",
      "sign-in",
      "sign-out",
    ]);
    expect(firstBrokenEntry(entries)).toBe(-1);
  });
});
