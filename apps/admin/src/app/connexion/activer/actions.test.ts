import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../../lib/admin-api", () => ({
  adminRequest: (...a: unknown[]) => adminRequest(...a),
}));

const { activateAccount } = await import("./actions");

// Placeholder values, never a real code or password.
function form(code: string, password: string, again = password): FormData {
  const data = new FormData();
  data.set("code", code);
  data.set("password", password);
  data.set("passwordAgain", again);
  return data;
}

const START = { done: false } as const;

beforeEach(() => {
  adminRequest.mockReset();
});

describe("activating an account", () => {
  it("sends the code and the chosen password", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: null });
    const state = await activateAccount(START, form("code-fictif", "une phrase de passe"));
    expect(state).toEqual({ done: true });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/auth/activate",
      method: "POST",
      body: { code: "code-fictif", password: "une phrase de passe" },
    });
  });

  it("asks for the whole link, and the same password twice, before calling the API", async () => {
    expect(await activateAccount(START, form("", "une phrase de passe"))).toMatchObject({
      error: expect.stringMatching(/incomplet/) as unknown,
    });
    expect(
      await activateAccount(START, form("code-fictif", "une phrase de passe", "autre chose")),
    ).toMatchObject({ error: expect.stringMatching(/différents/) as unknown });
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("explains a used or expired link, and a refused password", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 401, code: "ACCOUNT_ACTIVATION_INVALID" });
    expect(await activateAccount(START, form("code-fictif", "une phrase de passe"))).toMatchObject({
      error: expect.stringMatching(/ne fonctionne plus/) as unknown,
    });
    adminRequest.mockResolvedValue({ ok: false, status: 422, code: "ACCOUNT_PASSWORD_REJECTED" });
    expect(await activateAccount(START, form("code-fictif", "une phrase de passe"))).toMatchObject({
      error: expect.stringMatching(/12 caractères/) as unknown,
    });
    adminRequest.mockResolvedValue({ ok: false, status: null, code: null });
    expect(await activateAccount(START, form("code-fictif", "une phrase de passe"))).toMatchObject({
      error: expect.stringMatching(/indisponible/) as unknown,
    });
  });
});
