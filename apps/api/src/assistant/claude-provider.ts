import { z } from "zod";
import type { LlmProvider, LlmRequest, LlmResponse } from "./llm-provider";

/*
 * Claude, through Anthropic's Messages API (owner's decision of 07/10/2026: Haiku,
 * the cheapest model that answers well enough). The key comes from the secret
 * manager only; it never reaches the app nor the logs.
 */

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
export const DEFAULT_ASSISTANT_MODEL = "claude-haiku-4-5-20251001";

const messageSchema = z.object({
  model: z.string().min(1),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  usage: z.object({
    input_tokens: z.int().nonnegative(),
    output_tokens: z.int().nonnegative(),
    cache_read_input_tokens: z.int().nonnegative().nullish(),
    cache_creation_input_tokens: z.int().nonnegative().nullish(),
  }),
});

/** Anthropic refused or failed the call; `status` tells which (401 key, 429 limit…). */
export class ClaudeError extends Error {
  constructor(readonly status: number) {
    super(`Anthropic answered ${String(status)}`);
  }
}

export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export class ClaudeProvider implements LlmProvider {
  readonly name = "claude";
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClaudeProviderOptions) {
    this.model = options.model ?? DEFAULT_ASSISTANT_MODEL;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async complete(request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> {
    const response = await this.fetchImpl(MESSAGES_URL, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxOutputTokens,
        // The rules are the same for every question: once long enough to be cached
        // by Anthropic, they cost a tenth. Counted at full price below (prudent).
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.user }],
      }),
    });
    if (!response.ok) {
      throw new ClaudeError(response.status);
    }
    const message = messageSchema.parse(await response.json());
    const { usage } = message;
    return {
      text: message.content
        .map((block) => (block.type === "text" ? (block.text ?? "") : ""))
        .join(""),
      model: message.model,
      inputTokens:
        usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
    };
  }
}

/** Failures that say nothing about Anthropic's health: they do not open the circuit. */
export function isClaudeOutage(error: unknown): boolean {
  return !(error instanceof ClaudeError) || error.status === 429 || error.status >= 500;
}
