import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
const revalidatePath = vi.fn<(path: string) => void>();
vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => {
    revalidatePath(p);
  },
}));

const { fileUnderTheme } = await import("./actions");

function form(themeId: string, slugs: string[]): FormData {
  const data = new FormData();
  data.set("themeId", themeId);
  data.set("themeTitle", "Transports");
  for (const slug of slugs) {
    data.append("slug", slug);
  }
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
  revalidatePath.mockReset();
});

describe("filing procedures under a theme", () => {
  it("validates the checked procedures and says so", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { validated: 2 } });
    const state = await fileUnderTheme({}, form("a1", ["x", "y"]));
    expect(state).toEqual({ message: "2 démarches validées dans « Transports »." });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      token: "tok",
      body: { themeId: "a1", slugs: ["x", "y"] },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/demarches");
  });

  it("does nothing when nothing is checked", async () => {
    expect(await fileUnderTheme({}, form("a1", []))).toEqual({});
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("explains a refusal", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ADMIN_FORBIDDEN" });
    expect((await fileUnderTheme({}, form("a1", ["x"]))).error).toMatch(/rôle/);
    adminRequest.mockResolvedValue({ ok: false, status: null, code: "ADMIN_API_UNREACHABLE" });
    expect((await fileUnderTheme({}, form("a1", ["x"]))).error).toMatch(/échoué/);
  });
});
