import { NewsApiError } from "../api/json-getter";
import { retryPassingFailure } from "./QueryProvider";

describe("retryPassingFailure", () => {
  it("tries once more after a network or server failure", () => {
    expect(retryPassingFailure(0, new NewsApiError(null, "network"))).toBe(true);
    expect(retryPassingFailure(0, new NewsApiError(503, "server"))).toBe(true);
    expect(retryPassingFailure(1, new NewsApiError(503, "server"))).toBe(false);
  });

  it("does not repeat an answer that will not change (not found, withdrawn)", () => {
    expect(retryPassingFailure(0, new NewsApiError(404, "not found"))).toBe(false);
    expect(retryPassingFailure(0, new NewsApiError(410, "withdrawn"))).toBe(false);
  });
});
