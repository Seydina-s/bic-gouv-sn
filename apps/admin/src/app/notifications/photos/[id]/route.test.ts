import { describe, expect, it, vi } from "vitest";

const adminPicture = vi.fn<(...args: unknown[]) => Promise<ArrayBuffer | null>>();
vi.mock("../../../../lib/admin-api", () => ({
  adminPicture: (...a: unknown[]) => adminPicture(...a),
}));
vi.mock("../../../../lib/session", () => ({
  SESSION_COOKIE: "bgs_admin_session",
  readCookie: () => Promise.resolve("tok"),
}));

const { GET } = await import("./route");
const ID = "00000000-0000-4000-8000-0000000000d1";

describe("a written message's photo in the console", () => {
  it("comes from the API under the person's session, never cached", async () => {
    adminPicture.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const response = await GET(new Request("http://console.test"), {
      params: Promise.resolve({ id: ID }),
    });
    expect(adminPicture).toHaveBeenCalledWith(`/notifications/${ID}/photo`, "tok");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
