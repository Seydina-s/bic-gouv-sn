import { describe, expect, it, vi } from "vitest";
import { getApiStatus } from "./api-status";

const NOW = new Date("2026-09-24T14:32:00Z");
const healthy = {
  status: "ok",
  version: "1.4.0",
  uptimeSeconds: 11_520,
  checkedAt: "2026-09-24T14:32:00Z",
};

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("getApiStatus", () => {
  it("reports an unconfigured API without calling the network", async () => {
    const fetchImpl = respond(healthy);
    const status = await getApiStatus({ apiUrl: null, fetchImpl, now: () => NOW });
    expect(status).toEqual({ state: "unconfigured", checkedAt: NOW });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a healthy API with its version and uptime", async () => {
    const fetchImpl = respond(healthy);
    const status = await getApiStatus({ apiUrl: "http://api.test", fetchImpl, now: () => NOW });
    expect(status).toEqual({
      state: "up",
      checkedAt: NOW,
      version: "1.4.0",
      uptimeSeconds: 11_520,
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://api.test/v1/health");
  });

  it("reports down when the network fails, after one retry", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("fetch failed")));
    const status = await getApiStatus({ apiUrl: "http://api.test", fetchImpl, now: () => NOW });
    expect(status.state).toBe("down");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("recovers when the retry succeeds", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("blip"))
      .mockResolvedValueOnce(new Response(JSON.stringify(healthy)));
    const status = await getApiStatus({ apiUrl: "http://api.test", fetchImpl });
    expect(status.state).toBe("up");
  });

  it("reports down when the API does not answer in time", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<never>(() => undefined));
    const status = await getApiStatus({ apiUrl: "http://api.test", fetchImpl, timeoutMs: 20 });
    expect(status.state).toBe("down");
  });

  it.each([
    ["an unexpected body", respond({ hello: "world" })],
    ["a server error", respond(healthy, 500)],
    ["a non-JSON body", vi.fn<typeof fetch>(() => Promise.resolve(new Response("<html>")))],
  ])("reports invalid on %s, without retrying", async (_label, fetchImpl) => {
    const status = await getApiStatus({ apiUrl: "http://api.test", fetchImpl });
    expect(status.state).toBe("invalid");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
