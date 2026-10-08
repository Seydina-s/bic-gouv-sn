import { describe, expect, it, vi } from "vitest";
import {
  ClaudeError,
  ClaudeProvider,
  DEFAULT_ASSISTANT_MODEL,
  isClaudeOutage,
} from "./claude-provider";

const request = { system: "Rules", user: "Question", maxOutputTokens: 400 };

function replying(status: number, body: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

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
