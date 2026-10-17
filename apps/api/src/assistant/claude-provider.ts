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
/** Answers in Wolof: chosen by the owner in a blind comparison (11/10/2026). */
export const DEFAULT_WOLOF_MODEL = "claude-sonnet-5-5";

/**
 * Dollars per million tokens, from Anthropic's price list (read 11/10/2026). A model not
 * listed is counted at the highest price listed: the console never shows less than paid.
 */
const PRICES: readonly (readonly [prefix: string, input: number, output: number])[] = [
  ["claude-haiku-4-5", 1, 5],
  ["claude-haiku-5-5", 0.1, 0.5],
  ["claude-sonnet-5-5", 2, 10],
];
const HIGHEST = { input: 2, output: 10 };

/** What a call cost, in millionths of a dollar (dollars per million tokens × tokens). */
export function costOf(model: string, inputTokens: number, outputTokens: number): number {
  const listed = PRICES.find(([prefix]) => model.startsWith(prefix));
  const price = listed === undefined ? HIGHEST : { input: listed[1], output: listed[2] };
  return Math.ceil(inputTokens * price.input + outputTokens * price.output);
}

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
        thinking: noThinkingFirst(this.model),
        ...steadyAnswers(this.model),
      }),
    });
    if (!response.ok) {
      throw new ClaudeError(response.status);
    }
    const message = messageSchema.parse(await response.json());
    const { usage } = message;
    const inputTokens =
      usage.input_tokens +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);
    return {
      text: message.content
        .map((block) => (block.type === "text" ? (block.text ?? "") : ""))
        .join(""),
      model: message.model,
      inputTokens,
      outputTokens: usage.output_tokens,
      costMicrodollars: costOf(message.model, inputTokens, usage.output_tokens),
    };
  }
}

/**
 * Short answers from given extracts: no thinking first. Newer models think by default,
 * and their thinking used up the few tokens of an answer, which came back empty
 * (11/10/2026, Haiku 5.5 and Sonnet 5.5 on trial). Sonnet 5.5 asks for "between_tools"
 * to skip it (Anthropic's effort guide); the others accept "disabled".
 */
export function noThinkingFirst(model: string): { type: "disabled" | "between_tools" } {
  return { type: model.startsWith("claude-sonnet-5-5") ? "between_tools" : "disabled" };
}

/**
 * The same question with the same extracts gets the same answer: temperature 0 where
 * the model accepts it (bench of 17/10/2026: "Le chef de l'État a-t-il réagi à
 * l'attaque d'Ankara ?" was answered "not found", then rightly ten minutes later).
 * Claude 4.6 and later models, the 5 family among them, refuse any temperature (400):
 * nothing is sent to them.
 */
export function steadyAnswers(model: string): { temperature?: number } {
  return /^claude-(3-|haiku-4-5|sonnet-4-5|opus-4-1)/.test(model) ? { temperature: 0 } : {};
}

/** Failures that say nothing about Anthropic's health: they do not open the circuit. */
export function isClaudeOutage(error: unknown): boolean {
  return !(error instanceof ClaudeError) || error.status === 429 || error.status >= 500;
}
