import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveAssistantLimit } = await import("./actions");

function form(monthlyLimit: string): FormData {
  const data = new FormData();
  data.set("monthlyLimit", monthlyLimit);
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("the assistant's monthly limit", () => {
  it("sends the number typed, thousands spaces and all", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    const state = await saveAssistantLimit({}, form(" 20 000 "));
    expect(state.message).toBe("Limite enregistrée.");
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/assistant/limit",
      method: "PUT",
      body: { monthlyLimit: 20_000 },
    });
  });

  it("refuses what is not a whole number of questions, without calling the API", async () => {
    for (const typed of ["", "0", "2,5", "beaucoup", "2000000"]) {
      expect((await saveAssistantLimit({}, form(typed))).error).toMatch(/nombre entier/);
    }
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("explains that only an admin may change it", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ADMIN_FORBIDDEN" });
    expect((await saveAssistantLimit({}, form("100"))).error).toMatch(/administrateur/);
  });
});
