import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { adminPicture, adminRequest } from "./admin-api";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.test");
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("adminRequest", () => {
  it("sends the session token and the body, and validates the answer", async () => {
    fetchMock.mockResolvedValue(json({ validated: 2 }));
    const result = await adminRequest({
      path: "/procedure-themes/validate",
      method: "POST",
      token: "t".repeat(43),
      body: { themeId: "a1", slugs: ["x"] },
      schema: z.object({ validated: z.int() }),
    });
    expect(result).toEqual({ ok: true, data: { validated: 2 } });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.test/admin/v1/procedure-themes/validate");
    expect(init?.headers).toMatchObject({ authorization: `Bearer ${"t".repeat(43)}` });
    expect(init?.body).toBe(JSON.stringify({ themeId: "a1", slugs: ["x"] }));
  });

  it("returns the API's error code instead of throwing", async () => {
    fetchMock.mockResolvedValue(
      json({ code: "ADMIN_FORBIDDEN", message: "x", requestId: "r" }, 403),
    );
    expect(await adminRequest({ path: "/x", schema: z.object({}) })).toEqual({
      ok: false,
      status: 403,
      code: "ADMIN_FORBIDDEN",
    });
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    expect(await adminRequest({ path: "/x", schema: z.object({}) })).toEqual({
      ok: false,
      status: 500,
      code: null,
    });
  });

  it("explains an unexpected answer, an unreachable API and a missing address", async () => {
    fetchMock.mockResolvedValue(json({ unexpected: true }));
    expect(await adminRequest({ path: "/x", schema: z.object({ id: z.string() }) })).toMatchObject({
      code: "ADMIN_API_INVALID_RESPONSE",
    });
    fetchMock.mockRejectedValue(new Error("network"));
    expect(await adminRequest({ path: "/x", schema: z.object({}) })).toMatchObject({
      code: "ADMIN_API_UNREACHABLE",
    });
    vi.stubEnv("API_URL", "");
    expect(await adminRequest({ path: "/x", schema: z.object({}) })).toMatchObject({
      code: "ADMIN_API_UNCONFIGURED",
    });
  });

  it("accepts an empty answer (204)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await adminRequest({ path: "/auth/sign-out", method: "POST", schema: z.null() }),
    ).toEqual({ ok: true, data: null });
  });
});

describe("adminPicture", () => {
  it("brings back a JPEG with the person's session, and nothing else", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2]), { headers: { "content-type": "image/jpeg" } }),
    );
    const photo = await adminPicture("/participation/photos/x", "tok");
    expect(photo?.byteLength).toBe(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/admin/v1/participation/photos/x");
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      "Bearer tok",
    );
    fetchMock.mockResolvedValueOnce(json({ code: "PARTICIPATION_NOT_FOUND" }, 404));
    expect(await adminPicture("/participation/photos/x", "tok")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("API away"));
    expect(await adminPicture("/participation/photos/x", "tok")).toBeNull();
    vi.stubEnv("API_URL", "");
    expect(await adminPicture("/participation/photos/x", "tok")).toBeNull();
  });
});
