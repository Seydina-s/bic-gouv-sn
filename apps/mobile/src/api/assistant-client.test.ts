import { AskError, createAssistantClient } from "./assistant-client";

const question = { question: "Une question fictive ?", lang: "fr", mode: "ask" } as const;
const PAUSED = { status: "paused", text: null, sources: [], resumesOn: "2026-11-01" };

function answering(response: () => Response) {
  const fetchImpl = jest.fn(() => Promise.resolve(response()));
  return {
    fetchImpl,
    client: createAssistantClient({
      baseUrl: "https://api.test",
      fetchImpl,
    }),
  };
}

describe("the assistant client", () => {
  it("sends the question and reads the reply", async () => {
    const { client, fetchImpl } = answering(() => new Response(JSON.stringify(PAUSED)));
    expect(await client.ask(question)).toEqual(PAUSED);
    const [url, init] = (fetchImpl.mock.calls[0] ?? []) as unknown as [string, RequestInit];
    expect(url).toBe("https://api.test/v1/assistant/answers");
    expect(JSON.parse(init.body as string)).toEqual(question);
  });

  it.each([
    [429, "busy"],
    [503, "closed"],
    [500, "failed"],
  ])("explains an answer %i as %s", async (status, failure) => {
    const { client } = answering(() => new Response("{}", { status }));
    await expect(client.ask(question)).rejects.toEqual(new AskError(failure as never));
  });

  it("says offline when nothing came back, and failed on an unreadable reply", async () => {
    const offline = createAssistantClient({
      baseUrl: "https://api.test",
      fetchImpl: () => Promise.reject(new TypeError("Network request failed")),
    });
    await expect(offline.ask(question)).rejects.toMatchObject({ failure: "offline" });
    const { client } = answering(() => new Response(JSON.stringify({ status: "nouveau" })));
    await expect(client.ask(question)).rejects.toMatchObject({ failure: "failed" });
  });
});
