import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const jar = new Map<string, { value: string; options?: unknown }>();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => jar.get(name),
      set: (name: string, value: string, options: unknown) => jar.set(name, { value, options }),
      delete: (name: string) => jar.delete(name),
    }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));
// React's per-request cache is a no-op outside a server render: call through.
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("./admin-api", () => ({ adminRequest: (...args: unknown[]) => adminRequest(...args) }));

const session = await import("./session");
const ACCOUNT = { id: "u1", email: "a@b.sn", name: "Awa", role: "reviewer" };

beforeEach(() => {
  jar.clear();
  adminRequest.mockReset();
});

describe("console session", () => {
  it("keeps the token in a cookie scripts cannot read, sent to this site only", async () => {
    await session.setSessionCookie("token-value");
    expect(jar.get(session.SESSION_COOKIE)).toEqual({
      value: "token-value",
      options: { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 28_800 },
    });
    await session.setChallengeCookie("challenge");
    expect(jar.get(session.CHALLENGE_COOKIE)?.options).toMatchObject({ maxAge: 300 });
    await session.clearCookie(session.CHALLENGE_COOKIE);
    expect(await session.readCookie(session.CHALLENGE_COOKIE)).toBeNull();
  });

  it("asks the API who is signed in, and nobody without a cookie", async () => {
    expect(await session.currentAccount()).toBeNull();
    expect(adminRequest).not.toHaveBeenCalled();
    jar.set(session.SESSION_COOKIE, { value: "tok" });
    adminRequest.mockResolvedValue({ ok: true, data: ACCOUNT });
    expect(await session.currentAccount()).toEqual(ACCOUNT);
    adminRequest.mockResolvedValue({ ok: false, status: 401, code: "ADMIN_SESSION_EXPIRED" });
    expect(await session.currentAccount()).toBeNull();
  });

  it("sends signed-out people to the sign-in page", async () => {
    await expect(session.requireAccount()).rejects.toThrow("redirect:/connexion");
    jar.set(session.SESSION_COOKIE, { value: "tok" });
    adminRequest.mockResolvedValue({ ok: true, data: ACCOUNT });
    expect(await session.requireAccount()).toEqual({ account: ACCOUNT, token: "tok" });
  });
});
