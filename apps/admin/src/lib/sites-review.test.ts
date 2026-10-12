import { describe, expect, it, vi } from "vitest";
import { getSitesReview, sitesPublishingAgain } from "./sites-review";

const review = {
  checkedAt: "2026-10-12T03:00:00.000Z",
  sites: [
    {
      name: "Ministère fictif",
      url: "https://www.exemple.gouv.sn/",
      status: "publishing" as const,
      newestDay: "2026-10-02",
    },
    {
      name: "Autre ministère fictif",
      url: "https://www.autre.gouv.sn/",
      status: "frozen" as const,
      newestDay: "2023-12-28",
    },
  ],
};

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("getSitesReview", () => {
  it("reads the last review through the API", async () => {
    const fetchImpl = respond({ review });
    expect(await getSitesReview({ apiUrl: "http://api.test", fetchImpl })).toEqual(review);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://api.test/v1/status/sites");
  });

  it.each([
    ["no review yet", respond({ review: null })],
    ["an error answer", respond({ review }, 503)],
    ["an unexpected answer", respond({ review: { checkedAt: "yesterday" } })],
    [
      "an answer that is no JSON",
      vi.fn<typeof fetch>(() => Promise.resolve(new Response("<html>"))),
    ],
    ["an unreachable API", vi.fn<typeof fetch>(() => Promise.reject(new TypeError("down")))],
  ])("says none for %s", async (_label, fetchImpl) => {
    expect(await getSitesReview({ apiUrl: "http://api.test", fetchImpl })).toBeNull();
  });
});

describe("sitesPublishingAgain", () => {
  it("counts the sites publishing again, and knows nothing without a review", () => {
    expect(sitesPublishingAgain(review)).toBe(1);
    expect(sitesPublishingAgain(null)).toBeUndefined();
  });
});
