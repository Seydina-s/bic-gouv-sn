import type { QueryClient } from "@tanstack/react-query";
import { NewsApiError } from "../api/json-getter";
import { createQueryClient, keptOffline, retryPassingFailure } from "./QueryProvider";

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

describe("keptOffline", () => {
  // A week-long clean-up timer per client: cleared, or Jest never exits.
  const clients: QueryClient[] = [];
  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.clear();
    }
  });

  /** A query of this key, answered. */
  function answered(queryKey: readonly unknown[]) {
    const client = createQueryClient();
    clients.push(client);
    client.setQueryData(queryKey, { answered: true });
    const query = client.getQueryCache().find({ queryKey, exact: true });
    if (query === undefined) {
      throw new Error("query not built");
    }
    return query;
  }

  it("keeps what serves offline: feed, articles, sections, procedures, services", () => {
    for (const key of [
      ["news", "fr", "feed", "all"],
      ["news", "fr", "id-fictif"],
      ["news", "fr", "section", "communiques", null],
      ["procedures", "list", "all", ""],
      ["procedures", "detail", "demarche-fictive"],
      ["services"],
    ]) {
      expect(keptOffline(answered(key))).toBe(true);
    }
  });

  it("never keeps the searches typed", () => {
    expect(keptOffline(answered(["news", "fr", "search", "bourse"]))).toBe(false);
    expect(keptOffline(answered(["procedures", "list", "all", "passeport"]))).toBe(false);
  });
});
