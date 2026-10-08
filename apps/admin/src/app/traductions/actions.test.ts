import { beforeEach, describe, expect, it, vi } from "vitest";

const adminRequest = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const redirect = vi.fn<(path: string) => void>();
vi.mock("../../lib/admin-api", () => ({ adminRequest: (...a: unknown[]) => adminRequest(...a) }));
vi.mock("../../lib/session", () => ({
  requireAccount: () => Promise.resolve({ account: { id: "u1" }, token: "tok" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirect(path);
  },
}));

const { decideTranslation } = await import("./actions");

const ARTICLE = "00000000-0000-5000-8000-000000000001";

function form(decision: string, articleId = ARTICLE): FormData {
  const data = new FormData();
  data.set("articleId", articleId);
  data.set("decision", decision);
  return data;
}

beforeEach(() => {
  adminRequest.mockReset();
  redirect.mockReset();
});

describe("a decision on a machine translation", () => {
  it("sends it, then goes back to the list for the next one", async () => {
    adminRequest.mockResolvedValue({ ok: true, data: { saved: true } });
    await decideTranslation({}, form("validate"));
    expect(adminRequest.mock.calls[0]?.[0]).toMatchObject({
      path: `/translations/${ARTICLE}/decision`,
      method: "POST",
      body: { decision: "validate" },
    });
    expect(redirect).toHaveBeenCalledWith("/traductions");
  });

  it("refuses a decision it does not know, or a malformed article, without calling the API", async () => {
    expect((await decideTranslation({}, form("publish"))).error).toBeDefined();
    expect((await decideTranslation({}, form("validate", "../x"))).error).toBeDefined();
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("says when someone else already decided", async () => {
    adminRequest.mockResolvedValue({ ok: false, status: 409, code: "TRANSLATION_NOT_PENDING" });
    expect((await decideTranslation({}, form("set-aside"))).error).toMatch(/plus à relire/);
    expect(redirect).not.toHaveBeenCalled();
  });
});
