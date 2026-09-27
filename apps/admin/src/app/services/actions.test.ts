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

  it("moves the service to the place pasted from a map, and only when it changed", async () => {
    const { correctService } = await import("./actions");
    adminRequest.mockResolvedValue({
      ok: true,
      data: { corrected: true, location: { lat: 14.6928, lng: -17.4467 } },
    });
    const data = new FormData();
    data.set("id", "osm-n3");
    data.set("name", "Commissariat de test");
    data.set("category", "police");
    data.set("positionBefore", "14.7, -17.4");
    data.set("position", "https://www.openstreetmap.org/#map=19/14.6928/-17.4467");
    expect(await correctService({}, data)).toEqual({ message: "Correction enregistrée." });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      body: { location: { lat: 14.6928, lng: -17.4467 } },
    });
    // The same place, written differently: nothing moves.
    data.set("position", "14,7 ; -17,4");
    await correctService({}, data);
    expect(adminRequest.mock.calls[1]?.[0]).not.toHaveProperty("body.location");
  });

  it("says plainly when the server did not save the move (older version)", async () => {
    const { correctService } = await import("./actions");
    adminRequest.mockResolvedValue({ ok: true, data: { corrected: true } });
    const data = new FormData();
    data.set("id", "osm-n3");
    data.set("name", "Commissariat de test");
    data.set("category", "police");
    data.set("positionBefore", "14.7, -17.4");
    data.set("position", "14.6928, -17.4467");
    expect((await correctService({}, data)).error).toMatch(/pas l'emplacement/);
  });

  it("explains an unreadable place, or one outside Senegal, and sends nothing", async () => {
    const { correctService } = await import("./actions");
    const data = new FormData();
    data.set("id", "osm-n3");
    data.set("name", "Commissariat de test");
    data.set("category", "police");
    data.set("positionBefore", "14.7, -17.4");
    data.set("position", "Dakar");
    expect((await correctService({}, data)).error).toMatch(/illisible/);
    // Latitude and longitude swapped: the South Atlantic.
    data.set("position", "-17.4467, 14.6928");
    expect((await correctService({}, data)).error).toMatch(/pas au Sénégal/);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("adds a service the source misses, which then waits for its verification", async () => {
    const { addService } = await import("./actions");
    adminRequest.mockResolvedValue({ ok: true, data: { id: "manual-1" } });
    const data = new FormData();
    data.set("name", " Sous-préfecture de test ");
    data.set("category", "prefecture");
    data.set("position", "14,75 -17,35");
    data.set("address", "  ");
    data.set("phone", "+221 00 000 00 00");
    expect(await addService({}, data)).toEqual({
      message: "Service ajouté. Il attend maintenant sa vérification dans la liste « À vérifier ».",
    });
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/services",
      method: "POST",
      body: {
        name: "Sous-préfecture de test",
        category: "prefecture",
        location: { lat: 14.75, lng: -17.35 },
        address: null,
        phone: "+221 00 000 00 00",
      },
    });
    // Without a place, or outside Senegal: nothing is sent.
    data.set("position", "");
    expect((await addService({}, data)).error).toMatch(/illisible/);
    data.set("position", "48.86, 2.35");
    expect((await addService({}, data)).error).toMatch(/pas au Sénégal/);
    expect(adminRequest).toHaveBeenCalledTimes(1);
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
