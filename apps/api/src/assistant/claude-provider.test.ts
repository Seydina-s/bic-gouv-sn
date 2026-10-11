import { describe, expect, it, vi } from "vitest";
import {
  ClaudeError,
  ClaudeProvider,
  DEFAULT_ASSISTANT_MODEL,
  isClaudeOutage,
  noThinkingFirst,
  costOf,
} from "./claude-provider";

const request = { system: "Rules", user: "Question", maxOutputTokens: 400 };

function replying(status: number, body: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("noThinkingFirst", () => {
  it("skips the thinking before an answer the way each model asks", () => {
    expect(noThinkingFirst("claude-haiku-4-5-20251001")).toEqual({ type: "disabled" });
    expect(noThinkingFirst("claude-haiku-5-5")).toEqual({ type: "disabled" });
    expect(noThinkingFirst("claude-sonnet-5-5")).toEqual({ type: "between_tools" });
  });
});

describe("the Claude provider", () => {
  it("sends the rules and the question with the key, and reads the reply and its cost", async () => {
    const fetchImpl = replying(200, {
      model: "claude-haiku-4-5-20251001",
      content: [
        { type: "text", text: '{"status":"not_found",' },
        { type: "text", text: '"answer":""}' },
      ],
      usage: { input_tokens: 900, output_tokens: 20, cache_read_input_tokens: 100 },
    });
    const provider = new ClaudeProvider({ apiKey: "test-key", fetchImpl });

    const response = await provider.complete(request, new AbortController().signal);

    expect(response).toEqual({
      text: '{"status":"not_found","answer":""}',
      model: "claude-haiku-4-5-20251001",
      inputTokens: 1000,
      outputTokens: 20,
      // 1 000 tokens read at 1 $ and 20 written at 5 $ per million.
      costMicrodollars: 1100,
    });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init?.headers).toMatchObject({
      "x-api-key": "test-key",
      "anthropic-version": "2023-06-01",
    });
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: DEFAULT_ASSISTANT_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: "Question" }],
      thinking: { type: "disabled" },
    });
    expect(body["system"]).toEqual([
      { type: "text", text: "Rules", cache_control: { type: "ephemeral" } },
    ]);
  });

  it("uses the model it is given", async () => {
    const fetchImpl = replying(200, {
      model: "claude-sonnet-5",
      content: [],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    await new ClaudeProvider({ apiKey: "k", model: "claude-sonnet-5", fetchImpl }).complete(
      request,
      new AbortController().signal,
    );
    const body = JSON.parse(fetchImpl.mock.calls[0]?.[1]?.body as string) as { model: string };
    expect(body.model).toBe("claude-sonnet-5");
  });

  it("fails with the status of a refused call, never with the key", async () => {
    const provider = new ClaudeProvider({
      apiKey: "secret-key",
      fetchImpl: replying(401, { error: {} }),
    });
    const failure = provider.complete(request, new AbortController().signal);
    await expect(failure).rejects.toBeInstanceOf(ClaudeError);
    await expect(failure).rejects.not.toThrow(/secret-key/);
  });

  it("counts only outages against Anthropic's health", () => {
    expect(isClaudeOutage(new ClaudeError(503))).toBe(true);
    expect(isClaudeOutage(new ClaudeError(429))).toBe(true);
    expect(isClaudeOutage(new Error("network down"))).toBe(true);
    expect(isClaudeOutage(new ClaudeError(400))).toBe(false);
  });
});

describe("costOf", () => {
  it("counts each call at its model's price, an unknown model at the highest one", () => {
    // 1 000 tokens read, 100 written.
    expect(costOf("claude-haiku-4-5-20251001", 1000, 100)).toBe(1500);
    expect(costOf("claude-haiku-5-5", 1000, 100)).toBe(150);
    expect(costOf("claude-sonnet-5-5", 1000, 100)).toBe(3000);
    expect(costOf("un-modele-inconnu", 1000, 100)).toBe(3000);
  });
});
