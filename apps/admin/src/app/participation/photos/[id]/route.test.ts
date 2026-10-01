import { beforeEach, describe, expect, it, vi } from "vitest";

const adminPicture = vi.fn<(...args: unknown[]) => Promise<ArrayBuffer | null>>();
let mockToken: string | null = "tok";
vi.mock("../../../../lib/admin-api", () => ({
  adminPicture: (...a: unknown[]) => adminPicture(...a),
}));
vi.mock("../../../../lib/session", () => ({
  SESSION_COOKIE: "bgs_admin_session",
  readCookie: () => Promise.resolve(mockToken),
}));

const { GET } = await import("./route");
const ID = "00000000-0000-4000-8000-0000000000c1";
const ask = (id: string) =>
  GET(new Request("http://console.test"), { params: Promise.resolve({ id }) });

beforeEach(() => {
  adminPicture.mockReset();
  mockToken = "tok";
});

describe("a report's photo in the console", () => {
  it("comes from the API under the person's session, never cached", async () => {
    adminPicture.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const response = await ask(ID);
    expect(adminPicture).toHaveBeenCalledWith(`/participation/photos/${ID}`, "tok");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("is not found without a session, for a malformed id, or when the API has none", async () => {
    mockToken = null;
    expect((await ask(ID)).status).toBe(404);
    mockToken = "tok";
    expect((await ask("../../comptes")).status).toBe(404);
    expect(adminPicture).not.toHaveBeenCalled();
    adminPicture.mockResolvedValue(null);
    expect((await ask(ID)).status).toBe(404);
  });
});
