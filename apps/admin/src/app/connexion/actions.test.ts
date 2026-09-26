import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
const cookies = new Map<string, string>();
vi.mock("../../lib/session", () => ({
  SESSION_COOKIE: "session",
  CHALLENGE_COOKIE: "challenge",
  accountSchema: { parse: (v: unknown) => v },
  readCookie: (name: string) => Promise.resolve(cookies.get(name) ?? null),
  clearCookie: (name: string) => {
    cookies.delete(name);
    return Promise.resolve();
  },
  setChallengeCookie: (value: string) => {
    cookies.set("challenge", value);
    return Promise.resolve();
  },
  setSessionCookie: (value: string) => {
    cookies.set("session", value);
    return Promise.resolve();
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
vi.mock("qrcode", () => ({ default: { toString: () => Promise.resolve("<svg/>") } }));

const { advanceSignIn, signOut } = await import("./actions");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
  cookies.clear();
});

describe("sign-in steps", () => {
  it("asks for the code once the password is right", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { step: "code", challenge: "c1" } });
    const next = await advanceSignIn(
      { step: "password" },
      form({ email: "a@b.sn", password: "p" }),
    );
    expect(next).toEqual({ step: "code" });
    expect(cookies.get("challenge")).toBe("c1");
  });

  it("shows the QR code at the first sign-in", async () => {
    adminRequest.mockResolvedValue({
      ok: true,
      data: { step: "enroll", challenge: "c1", otpauthUri: "otpauth://totp/x", secret: "ABC" },
    });
    expect(await advanceSignIn({ step: "password" }, form({}))).toEqual({
      step: "enroll",
      qrSvg: "<svg/>",
      secret: "ABC",
    });
  });

  it("explains refusals in plain words", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 401, code: "ADMIN_SIGN_IN_FAILED" });
    expect((await advanceSignIn({ step: "password" }, form({}))).error).toBe(
      "Adresse, mot de passe ou code incorrect.",
    );
    adminRequest.mockResolvedValue({ ok: false, status: 429, code: "ADMIN_TOO_MANY_ATTEMPTS" });
    expect((await advanceSignIn({ step: "password" }, form({}))).error).toMatch(/15 minutes/);
    adminRequest.mockResolvedValue({ ok: false, status: null, code: "ADMIN_API_UNREACHABLE" });
    expect((await advanceSignIn({ step: "password" }, form({}))).error).toMatch(/indisponible/);
  });

  it("opens the session with a right code, spaces ignored", async () => {
    cookies.set("challenge", "c1");
    adminRequest.mockResolvedValue({ ok: true, data: { token: "tok", account: {} } });
    await expect(advanceSignIn({ step: "code" }, form({ code: "123 456" }))).rejects.toThrow(
      "redirect:/",
    );
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      body: { challenge: "c1", code: "123456" },
    });
    expect(cookies.get("session")).toBe("tok");
    expect(cookies.has("challenge")).toBe(false);
  });

  it("stays on the code after a wrong code, back to the password when expired", async () => {
    cookies.set("challenge", "c1");
    adminRequest.mockResolvedValue({ ok: false, status: 401, code: "ADMIN_SIGN_IN_FAILED" });
    expect(await advanceSignIn({ step: "code" }, form({ code: "000000" }))).toMatchObject({
      step: "code",
    });
    adminRequest.mockResolvedValue({ ok: false, status: 401, code: "ADMIN_SESSION_EXPIRED" });
    expect(await advanceSignIn({ step: "code" }, form({ code: "000000" }))).toMatchObject({
      step: "password",
    });
    expect(await advanceSignIn({ step: "code" }, form({ code: "000000" }))).toMatchObject({
      step: "password",
    });
  });

  it("signs out: the session ends at the API and the cookie goes", async () => {
    cookies.set("session", "tok");
    adminRequest.mockResolvedValue({ ok: true, data: null });
    await expect(signOut()).rejects.toThrow("redirect:/connexion");
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({ path: "/auth/sign-out", token: "tok" });
    expect(cookies.has("session")).toBe(false);
  });
});
