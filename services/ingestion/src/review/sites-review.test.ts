import { describe, expect, it, vi } from "vitest";
import {
  isCertificateError,
  isSitesReviewDue,
  newestDayIn,
  reviewSite,
  reviewSites,
} from "./sites-review";

const NOW = new Date("2026-10-12T03:00:00Z");
const SITE = { name: "Ministère fictif", url: "https://www.exemple.gouv.sn/" };

/** A site answering `html`, at `url` once redirections are followed. */
function answering(html: string, init: ResponseInit = {}, url = SITE.url) {
  return vi.fn<typeof fetch>(() => {
    const response = new Response(html, init);
    Object.defineProperty(response, "url", { value: url });
    return Promise.resolve(response);
  });
}

describe("newestDayIn", () => {
  it("finds the newest day a page shows, written in any of the usual ways", () => {
    expect(
      newestDayIn(
        '<time datetime="2024-06-12T10:00:00">x</time> <span>13 janvier 2024</span> 05/03/2026',
        "2026-10-12",
      ),
    ).toBe("2026-03-05");
    expect(newestDayIn("<p>1er octobre 2026</p>", "2026-10-12")).toBe("2026-10-01");
    // Days in the page's head or scripts are technical (11/10/2026: a plugin's update
    // made two frozen sites look active), never a publication.
    expect(
      newestDayIn(
        '<head><meta content="2026-09-29"></head><script>{"modified":"2026-09-29"}</script><p>28 décembre 2023</p>',
        "2026-10-12",
      ),
    ).toBe("2023-12-28");
    // A day after today (an event announced) or not a day is not a publication.
    expect(newestDayIn("<p>2027-01-01 ; 2026-13-45</p>", "2026-10-12")).toBeNull();
  });
});

describe("reviewSite", () => {
  it("tells a site publishing again from a frozen one", async () => {
    const publishing = await reviewSite(SITE, {
      fetchImpl: answering("<p>Publié le 2 octobre 2026</p>"),
      now: () => NOW,
    });
    expect(publishing).toEqual({ ...SITE, status: "publishing", newestDay: "2026-10-02" });
    const frozen = await reviewSite(SITE, {
      fetchImpl: answering("<p>13 janvier 2024</p>"),
      now: () => NOW,
    });
    expect(frozen.status).toBe("frozen");
  });

  it("tells a certificate refused, a site down, closed by a password or in error", async () => {
    const certificate = vi.fn<typeof fetch>(() =>
      Promise.reject(new TypeError("fetch failed", { cause: { code: "CERT_HAS_EXPIRED" } })),
    );
    expect((await reviewSite(SITE, { fetchImpl: certificate })).status).toBe("certificate");
    const down = vi.fn<typeof fetch>(() =>
      Promise.reject(new TypeError("fetch failed", { cause: { code: "ETIMEDOUT" } })),
    );
    expect((await reviewSite(SITE, { fetchImpl: down })).status).toBe("unreachable");
    const locked = answering(
      "<form>Mot de passe</form>",
      {},
      "https://www.exemple.gouv.sn/?password-protected=login",
    );
    expect((await reviewSite(SITE, { fetchImpl: locked })).status).toBe("protected");
    const error = answering("Service Unavailable", { status: 503 });
    expect((await reviewSite(SITE, { fetchImpl: error })).status).toBe("unreachable");
  });

  it("knows a certificate refusal from other failures", () => {
    expect(
      isCertificateError(new Error("x", { cause: { code: "ERR_TLS_CERT_ALTNAME_INVALID" } })),
    ).toBe(true);
    expect(isCertificateError(new Error("x"))).toBe(false);
    expect(isCertificateError("x")).toBe(false);
  });
});

describe("reviewSites", () => {
  it("looks at every site once, and dates the review", async () => {
    const fetchImpl = answering("<p>2026-09-30</p>");
    const review = await reviewSites([SITE, { ...SITE, name: "Autre" }], {
      fetchImpl,
      now: () => NOW,
    });
    expect(review.checkedAt).toBe(NOW.toISOString());
    expect(review.sites.map((site) => site.status)).toEqual(["publishing", "publishing"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("isSitesReviewDue", () => {
  it("is due at night once a week, or at once when never made", () => {
    expect(isSitesReviewDue(NOW, null)).toBe(true);
    expect(isSitesReviewDue(NOW, "2026-10-08T03:00:00Z")).toBe(false);
    expect(isSitesReviewDue(NOW, "2026-10-05T03:00:00Z")).toBe(true);
    expect(isSitesReviewDue(new Date("2026-10-12T12:00:00Z"), null)).toBe(false);
  });
});
