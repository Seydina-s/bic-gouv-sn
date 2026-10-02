import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { correctOpportunity, decideOpportunity, prepareOpportunity } = await import("./actions");

// Placeholder opportunity, never a real one.
function draft(deadline: string): FormData {
  const data = new FormData();
  data.set("kind", "formation");
  data.set("title", "Formation fictive");
  data.set("organization", "Organisme fictif");
  data.set("summary", "Résumé fictif de la page officielle.");
  data.set("deadline", deadline);
  data.set("officialUrl", " https://3fpt.sn/appel/ ");
  return data;
}

function decision(value: string): FormData {
  const data = new FormData();
  data.set("id", "00000000-0000-4000-8000-000000000001");
  data.set("decision", value);
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
});

describe("opportunity actions", () => {
  it("prepare: no closing date becomes null, the link is trimmed, and it says what comes next", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    const state = await prepareOpportunity({}, draft(""));
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/opportunities",
      method: "POST",
      body: { deadline: null, officialUrl: "https://3fpt.sn/appel/" },
    });
    expect(state.message).toMatch(/une autre personne/);
  });

  it("explain each refusal in plain words", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 400, code: "REQUEST_INVALID" });
    expect((await prepareOpportunity({}, draft("2026-12-31"))).error).toMatch(/portail officiel/);
    adminRequest.mockResolvedValue({ ok: false, status: 403, code: "OPPORTUNITY_SAME_PERSON" });
    expect((await decideOpportunity({}, decision("publish"))).error).toMatch(/une autre personne/);
    adminRequest.mockResolvedValue({ ok: false, status: null, code: "ADMIN_API_UNREACHABLE" });
    expect((await decideOpportunity({}, decision("withdraw"))).error).toMatch(/Réessayez/);
  });

  it("correct: the same fields, to the opportunity named by the form", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    const data = draft("2026-12-31");
    data.set("id", "00000000-0000-4000-8000-000000000001");
    expect((await correctOpportunity({}, data)).message).toMatch(/Correction enregistrée/);
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: "/opportunities/00000000-0000-4000-8000-000000000001",
      method: "PUT",
      body: { deadline: "2026-12-31", officialUrl: "https://3fpt.sn/appel/" },
    });
  });

  it("publish or withdraw the opportunity named by the form", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: {} });
    expect((await decideOpportunity({}, decision("publish"))).message).toMatch(/publiée/);
    expect((await decideOpportunity({}, decision("anything"))).message).toMatch(/retirée/);
    expect(adminRequest.mock.calls.map((call) => (call[0] as { path: string }).path)).toEqual([
      "/opportunities/00000000-0000-4000-8000-000000000001/publish",
      "/opportunities/00000000-0000-4000-8000-000000000001/withdraw",
    ]);
  });
});
