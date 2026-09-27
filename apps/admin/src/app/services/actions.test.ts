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

const { reviewServices } = await import("./actions");

function form(decision: string, ids: string[]): FormData {
  const data = new FormData();
  data.set("decision", decision);
  for (const id of ids) {
    data.append("id", id);
  }
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
  revalidatePath.mockReset();
});

describe("verifying state services", () => {
  it("verifies the ticked services and says they now appear in the app", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { reviewed: 2 } });
    const state = await reviewServices({}, form("verified", ["osm-n1", "osm-n2"]));
    expect(state).toEqual({
      message: "2 services vérifiés : ils apparaissent dans l'application.",
    });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/services/review",
      token: "tok",
      body: { decision: "verified", ids: ["osm-n1", "osm-n2"] },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/services");
  });

  it("rejects the ticked services", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { reviewed: 1 } });
    expect(await reviewServices({}, form("rejected", ["osm-n3"]))).toEqual({
      message: "1 service écarté.",
    });
  });

  it("does nothing without a ticked service or a known decision", async () => {
    expect(await reviewServices({}, form("verified", []))).toEqual({});
    expect(await reviewServices({}, form("deleted", ["osm-n1"]))).toEqual({});
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("explains a refusal", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "ADMIN_FORBIDDEN" });
    expect((await reviewServices({}, form("verified", ["osm-n1"]))).error).toMatch(/rôle/);
  });
});

describe("correcting a state service", () => {
  it("sends the corrected name and kind, and says it is saved", async () => {
    const { correctService } = await import("./actions");
    adminRequest.mockResolvedValue({ ok: true, data: { corrected: true } });
    const data = new FormData();
    data.set("id", "osm-n3");
    data.set("name", " Commissariat de test ");
    data.set("category", "police");
    expect(await correctService({}, data)).toEqual({ message: "Correction enregistrée." });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/services/osm-n3/correction",
      method: "PATCH",
      body: { name: "Commissariat de test", category: "police" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/services");
  });

  it("does nothing without a name", async () => {
    const { correctService } = await import("./actions");
    const data = new FormData();
    data.set("id", "osm-n3");
    data.set("name", "  ");
    expect(await correctService({}, data)).toEqual({});
    expect(adminRequest).not.toHaveBeenCalled();
  });
});
