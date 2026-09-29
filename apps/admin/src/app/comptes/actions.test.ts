import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { changeAccess, changeRole, createAccount, renewActivation } = await import("./actions");

// Placeholder person, not a real team member.
function person(email: string, emailAgain = email): FormData {
  const data = new FormData();
  data.set("name", "Personne de test");
  data.set("email", email);
  data.set("emailAgain", emailAgain);
  data.set("role", "editor");
  return data;
}

function access(action: string, confirm?: string): FormData {
  const data = new FormData();
  data.set("id", "a1");
  data.set("action", action);
  if (confirm !== undefined) {
    data.set("confirm", confirm);
  }
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("adding a person", () => {
  it("sends the address in lower case and hands back the one-time link", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      data: { code: "code-a-usage-unique", expiresAt: "2026-10-02T08:00:00.000Z" },
    });
    const state = await createAccount({}, person(" Personne@BIC.test", "personne@bic.test"));
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/accounts",
      method: "POST",
      body: { email: "personne@bic.test", role: "editor" },
    });
    expect(state.activation).toEqual({
      code: "code-a-usage-unique",
      expiresAt: "2026-10-02T08:00:00.000Z",
    });
  });

  it("sends the form's key, so a form sent twice creates one account", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      data: { code: "code-a-usage-unique", expiresAt: "2026-10-02T08:00:00.000Z" },
    });
    const data = person("personne@bic.test");
    data.set("idempotencyKey", "cle-de-test-du-formulaire");
    await createAccount({}, data);
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      idempotencyKey: "cle-de-test-du-formulaire",
    });
  });

  it("refuses two different addresses before asking the API", async () => {
    const state = await createAccount({}, person("personne@bic.test", "persone@bic.test"));
    expect(state.error).toMatch(/différentes/);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("explains an address already used", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 409, code: "ACCOUNT_EMAIL_TAKEN" });
    expect((await createAccount({}, person("personne@bic.test"))).error).toMatch(/existe déjà/);
  });
});

describe("changing someone's access", () => {
  it("resets a second factor only once the identity is checked", async () => {
    expect((await changeAccess({}, access("reset-second-factor"))).error).toMatch(/vérifié/);
    expect(adminRequest).not.toHaveBeenCalled();
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    await changeAccess({}, access("reset-second-factor", "yes"));
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/accounts/a1/reset-second-factor",
    });
  });

  it("explains that nobody changes their own account", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ACCOUNT_SELF" });
    expect((await changeAccess({}, access("disable"))).error).toMatch(/propre compte/);
  });

  it("changes a role, and refuses one that does not exist", async () => {
    const data = new FormData();
    data.set("id", "a1");
    data.set("role", "owner");
    expect((await changeRole({}, data)).error).toMatch(/Vérifiez/);
    expect(adminRequest).not.toHaveBeenCalled();
    data.set("role", "admin");
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    expect((await changeRole({}, data)).message).toMatch(/tout de suite/);
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/accounts/a1/role",
      body: { role: "admin" },
    });
  });

  it("makes a new activation link, shown once", async () => {
    const data = new FormData();
    data.set("id", "a1");
    adminRequest.mockResolvedValue({
      ok: true,
      data: { code: "nouveau-code", expiresAt: "2026-10-02T08:00:00.000Z" },
    });
    expect((await renewActivation({}, data)).activation?.code).toBe("nouveau-code");
    adminRequest.mockResolvedValue({ ok: false, status: 409, code: "ACCOUNT_ALREADY_ACTIVE" });
    expect((await renewActivation({}, data)).error).toMatch(/déjà activé/);
  });

  it("says a passing failure plainly", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: null, code: "ADMIN_API_UNREACHABLE" });
    expect((await changeAccess({}, access("enable"))).error).toMatch(/Réessayez/);
  });

  it("refuses an unknown action", async () => {
    expect((await changeAccess({}, access("delete"))).error).toMatch(/Vérifiez/);
    expect(adminRequest).not.toHaveBeenCalled();
  });
});
