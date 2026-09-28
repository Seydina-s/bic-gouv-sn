import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { saveRemoteConfig } = await import("./actions");

function form(checked: string[], minVersion: string): FormData {
  const data = new FormData();
  for (const feature of checked) {
    data.set(feature, "on");
  }
  data.set("minVersion", minVersion);
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("remote control of the apps", () => {
  it("sends every switch, the unticked ones off, and the minimum version", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { saved: true } });
    const state = await saveRemoteConfig({}, form(["nearMe", "procedures"], " 1.2.0 "));
    expect(state.message).toMatch(/Enregistré/);
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/remote-config",
      method: "PUT",
      body: {
        minVersion: "1.2.0",
        features: { nearMe: true, map: false, readAloud: false, procedures: true },
      },
    });
  });

  it("requires no version when left empty, and refuses an unreadable one", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { saved: true } });
    await saveRemoteConfig({}, form([], ""));
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({ body: { minVersion: null } });
    expect((await saveRemoteConfig({}, form([], "version 2"))).error).toMatch(/illisible/);
    expect(adminRequest).toHaveBeenCalledTimes(1);
  });

  it("explains that only an admin may change it", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ADMIN_FORBIDDEN" });
    expect((await saveRemoteConfig({}, form([], ""))).error).toMatch(/administrateur/);
  });
});
