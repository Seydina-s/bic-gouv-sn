import {
  accountsResponseSchema,
  accountViewSchema,
  activationSchema,
  apiErrorSchema,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder people, not real team members.
const NEW_PERSON = {
  name: "Personne de test",
  email: "Nouvelle.Personne@bic.test",
  role: "editor",
};
const NEW_PASSWORD = "une autre phrase de passe";

let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
});

const call = (token: string | null, method: "GET" | "POST", url: string, payload?: object) =>
  app.inject({
    method,
    url: `/admin/v1${url}`,
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload }),
  });

const codeOf = (response: Awaited<ReturnType<typeof call>>) =>
  apiErrorSchema.parse(response.json()).code;

async function create(token: string, person: object = NEW_PERSON) {
  const response = await call(token, "POST", "/accounts", person);
  expect(response.statusCode).toBe(201);
  return activationSchema.parse(response.json());
}

const activate = (code: string, password = NEW_PASSWORD) =>
  call(null, "POST", "/auth/activate", { code, password });

describe("the team's accounts", () => {
  it("are for administrators only", async () => {
    expect((await call(null, "GET", "/accounts")).statusCode).toBe(401);
    for (const role of ["reviewer", "editor"] as const) {
      const token = await admin.tokenFor(role);
      expect((await call(token, "GET", "/accounts")).statusCode).toBe(403);
      expect((await call(token, "POST", "/accounts", NEW_PERSON)).statusCode).toBe(403);
    }
  });

  it("creates an account whose person chooses the password, never the administrator", async () => {
    const { token } = await admin.signedIn("admin");
    const created = await create(token);
    expect(created.account).toMatchObject({
      email: "nouvelle.personne@bic.test",
      role: "editor",
      state: "invited",
    });
    expect(created.code.length).toBeGreaterThanOrEqual(40);
    // Not activated: signing in is answered like an unknown address.
    const early = await call(null, "POST", "/auth/password", {
      email: NEW_PERSON.email,
      password: NEW_PASSWORD,
    });
    expect(codeOf(early)).toBe("ADMIN_SIGN_IN_FAILED");

    expect(codeOf(await activate(created.code, "trop court"))).toBe("ACCOUNT_PASSWORD_REJECTED");
    expect((await activate(created.code)).statusCode).toBe(204);
    expect(codeOf(await activate(created.code))).toBe("ACCOUNT_ACTIVATION_INVALID");

    const signIn = await call(null, "POST", "/auth/password", {
      email: NEW_PERSON.email,
      password: NEW_PASSWORD,
    });
    expect(signIn.json()).toMatchObject({ step: "enroll" });
    const list = accountsResponseSchema.parse((await call(token, "GET", "/accounts")).json());
    expect(list.accounts.find((account) => account.id === created.account.id)?.state).toBe(
      "no-second-factor",
    );
    const actions = (await admin.journal.entries()).map((entry) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(["account.created", "account.activated"]));
  });

  it("never shows a password, a fingerprint or a secret, and is never cached", async () => {
    const { token } = await admin.signedIn("admin");
    await create(token);
    const response = await call(token, "GET", "/accounts");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).not.toMatch(/passwordHash|codeHash|sealedSecret|totp/);
  });

  it("refuses a second account with the same address", async () => {
    const { token } = await admin.signedIn("admin");
    await create(token);
    const again = await call(token, "POST", "/accounts", {
      ...NEW_PERSON,
      email: "nouvelle.personne@bic.test",
    });
    expect(again.statusCode).toBe(409);
    expect(codeOf(again)).toBe("ACCOUNT_EMAIL_TAKEN");
  });

  it("changes a role, journaled with the previous one", async () => {
    const { token } = await admin.signedIn("admin");
    const other = await admin.signedIn("reviewer");
    const changed = await call(token, "POST", `/accounts/${other.id}/role`, { role: "editor" });
    expect(accountViewSchema.parse(changed.json()).role).toBe("editor");
    // Applies at once: the other person's session now holds the new role.
    expect((await call(other.token, "GET", "/auth/me")).json()).toMatchObject({ role: "editor" });
    const entry = (await admin.journal.entries()).find(
      (item) => item.action === "account.role-changed",
    );
    expect(entry).toMatchObject({ target: other.id, details: { from: "reviewer", to: "editor" } });
  });

  it("never lets administrators change their own account", async () => {
    const self = await admin.signedIn("admin");
    for (const [path, body] of [
      ["role", { role: "reviewer" }],
      ["disable", undefined],
      ["reset-second-factor", undefined],
    ] as const) {
      const response = await call(self.token, "POST", `/accounts/${self.id}/${path}`, body);
      expect(response.statusCode).toBe(403);
      expect(codeOf(response)).toBe("ACCOUNT_SELF");
    }
  });

  it("disables an account, which ends its sessions, and enables it again", async () => {
    const { token } = await admin.signedIn("admin");
    const other = await admin.signedIn("editor");
    const disabled = await call(token, "POST", `/accounts/${other.id}/disable`);
    expect(accountViewSchema.parse(disabled.json()).state).toBe("disabled");
    expect((await call(other.token, "GET", "/auth/me")).statusCode).toBe(401);
    const enabled = await call(token, "POST", `/accounts/${other.id}/enable`);
    expect(accountViewSchema.parse(enabled.json()).state).toBe("active");
  });

  it("resets a second factor: sessions end, the next sign-in sets it up again", async () => {
    const { token } = await admin.signedIn("admin");
    const other = await admin.signedIn("editor");
    const reset = await call(token, "POST", `/accounts/${other.id}/reset-second-factor`);
    expect(accountViewSchema.parse(reset.json()).state).toBe("no-second-factor");
    expect((await call(other.token, "GET", "/auth/me")).statusCode).toBe(401);
    const accounts = await admin.accounts.list();
    const email = accounts.find((account) => account.id === other.id)?.email ?? "";
    const signIn = await call(null, "POST", "/auth/password", { email, password: admin.password });
    expect(signIn.json()).toMatchObject({ step: "enroll" });
  });

  it("gives a new link to an account not activated yet; the previous one stops working", async () => {
    const { token } = await admin.signedIn("admin");
    const first = await create(token);
    const renewed = await call(token, "POST", `/accounts/${first.account.id}/activation`);
    const second = activationSchema.parse(renewed.json());
    expect(codeOf(await activate(first.code))).toBe("ACCOUNT_ACTIVATION_INVALID");
    expect((await activate(second.code)).statusCode).toBe(204);
    const again = await call(token, "POST", `/accounts/${first.account.id}/activation`);
    expect(again.statusCode).toBe(409);
    expect(codeOf(again)).toBe("ACCOUNT_ALREADY_ACTIVE");
  });

  it("answers an unknown account plainly", async () => {
    const { token } = await admin.signedIn("admin");
    const response = await call(token, "POST", `/accounts/${crypto.randomUUID()}/disable`);
    expect(response.statusCode).toBe(404);
    expect(codeOf(response)).toBe("ACCOUNT_NOT_FOUND");
  });
});
