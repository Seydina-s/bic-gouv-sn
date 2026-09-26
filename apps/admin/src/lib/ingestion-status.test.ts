import { describe, expect, it, vi } from "vitest";
import { getIngestionReport } from "./ingestion-status";

const report = {
  checkedAt: "2026-09-26T10:00:00.000Z",
  lastSuccessAt: "2026-09-26T10:00:00.000Z",
  lastChangeAt: null,
  lastDetectionSeconds: null,
  consecutiveFailures: 0,
  lastFailure: null,
};

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("getIngestionReport", () => {
  it("reads the last report through the API", async () => {
    const fetchImpl = respond({ report });
    expect(await getIngestionReport({ apiUrl: "http://api.test", fetchImpl })).toEqual(report);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://api.test/v1/status/ingestion");
  });

  it("has no report without an API address, and never calls the network then", async () => {
    const fetchImpl = respond({ report });
    expect(await getIngestionReport({ apiUrl: null, fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["no report yet", respond({ report: null })],
    ["an error answer", respond({ report }, 503)],
    ["an unexpected answer", respond({ report: { checkedAt: "yesterday" } })],
    ["an unreachable API", vi.fn<typeof fetch>(() => Promise.reject(new TypeError("down")))],
  ])("says none for %s", async (_label, fetchImpl) => {
    expect(await getIngestionReport({ apiUrl: "http://api.test", fetchImpl })).toBeNull();
  });
});
