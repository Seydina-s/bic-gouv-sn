import { createNewsClient, langQuery } from "./news-client";

/** Every address the client asked, the API answering with an empty page. */
function asking() {
  const fetchImpl = jest.fn<Promise<Response>, [string]>(() =>
    Promise.resolve(
      new Response(JSON.stringify({ items: [], nextCursor: null, sections: [], publishers: [] })),
    ),
  );
  const client = createNewsClient({
    baseUrl: "https://api.test",
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  const urls = () => fetchImpl.mock.calls.map(([url]) => new URL(url));
  return { client, urls };
}

describe("the language of the news asked", () => {
  it("asks French alone, and any other language with a French fallback", () => {
    expect(langQuery("fr")).toEqual({ lang: "fr" });
    expect(langQuery("wo")).toEqual({ lang: "wo", fallback: "fr" });
    expect(langQuery("en")).toEqual({ lang: "en", fallback: "fr" });
  });

  it("sends the fallback with every news request in English", async () => {
    const { client, urls } = asking();
    await Promise.allSettled([
      client.listNews("en", null),
      client.storyPage("en", { category: "communiques" }, 1),
      client.publishers("en"),
      client.sections("en"),
      client.searchNews("en", "conseil"),
      client.latestIn("en", "communiques"),
      client.getNews("00000000-0000-5000-8000-000000000001", "en"),
    ]);
    expect(urls()).toHaveLength(7);
    for (const url of urls()) {
      expect(url.searchParams.get("lang")).toBe("en");
      expect(url.searchParams.get("fallback")).toBe("fr");
    }
  });

  it("sends no fallback in French", async () => {
    const { client, urls } = asking();
    await Promise.allSettled([client.listNews("fr", null), client.publishers("fr")]);
    expect(urls().map((url) => url.searchParams.has("fallback"))).toEqual([false, false]);
  });
});
