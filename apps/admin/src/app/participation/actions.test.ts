import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { markHandled } = await import("./actions");

function entry(): FormData {
  const data = new FormData();
  data.set("id", "00000000-0000-4000-8000-000000000002");
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("marking a message as handled", () => {
  it("names the message and confirms", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    expect((await markHandled({}, entry())).message).toMatch(/traité/);
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/participation/00000000-0000-4000-8000-000000000002/handled",
      method: "POST",
    });
  });

  it("explains a refusal or a passing failure", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ADMIN_FORBIDDEN" });
    expect((await markHandled({}, entry())).error).toMatch(/éditeurs/);
    adminRequest.mockResolvedValue({ ok: false, status: null, code: "ADMIN_API_UNREACHABLE" });
    expect((await markHandled({}, entry())).error).toMatch(/Réessayez/);
  });
});
