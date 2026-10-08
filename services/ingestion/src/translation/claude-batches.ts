import { withTimeout } from "@bgs/resilience";
import { z } from "zod";

/*
 * Anthropic's Message Batches: many translations sent at once, answered within a
 * day at half the price (owner's decision of 03/10/2026: translation is done once
 * per article, never while someone waits). The key comes from the environment only.
 */

const API = "https://api.anthropic.com/v1/messages/batches";
const API_VERSION = "2023-06-01";
const TIMEOUT_MS = 60_000;

export interface BatchRequest {
  /** The article's id: the reply is matched to it. */
  customId: string;
  system: string;
  user: string;
  maxOutputTokens: number;
}

export type BatchStatus = "in_progress" | "canceling" | "ended";

export type BatchResult =
  | {
      customId: string;
      ok: true;
      text: string;
      inputTokens: number;
      outputTokens: number;
      /** The reply stopped at its length limit: incomplete, never saved. */
      truncated: boolean;
    }
  | { customId: string; ok: false; reason: string };

const batchSchema = z.object({
  id: z.string().min(1),
  processing_status: z.enum(["in_progress", "canceling", "ended"]),
  results_url: z.string().nullable().optional(),
});

const resultLineSchema = z.object({
  custom_id: z.string(),
  result: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("succeeded"),
      message: z.object({
        content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
        stop_reason: z.string().nullish(),
        usage: z.object({
          input_tokens: z.int().nonnegative(),
          output_tokens: z.int().nonnegative(),
          cache_read_input_tokens: z.int().nonnegative().nullish(),
          cache_creation_input_tokens: z.int().nonnegative().nullish(),
        }),
      }),
    }),
    z.object({ type: z.literal("errored"), error: z.unknown() }),
    z.object({ type: z.literal("canceled") }),
    z.object({ type: z.literal("expired") }),
  ]),
});

/** Anthropic refused or failed the call; never carries the key. */
export class BatchApiError extends Error {
  constructor(readonly status: number) {
    super(`Anthropic batches answered ${String(status)}`);
  }
}

export interface ClaudeBatchesOptions {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}

export class ClaudeBatches {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClaudeBatchesOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    const response = await withTimeout(
      (signal) =>
        this.fetchImpl(url, {
          ...init,
          signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": this.options.apiKey,
            "anthropic-version": API_VERSION,
          },
        }),
      { timeoutMs: TIMEOUT_MS },
    );
    if (!response.ok) {
      throw new BatchApiError(response.status);
    }
    return response;
  }

  /** Sends the requests; returns the batch id to collect later. */
  async create(requests: readonly BatchRequest[]): Promise<string> {
    const body = {
      requests: requests.map((request) => ({
        custom_id: request.customId,
        params: {
          model: this.options.model,
          max_tokens: request.maxOutputTokens,
          // The same rules and examples for every article: read once, then cached.
          system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: request.user }],
        },
      })),
    };
    const response = await this.call(API, { method: "POST", body: JSON.stringify(body) });
    return batchSchema.parse(await response.json()).id;
  }

  async status(id: string): Promise<{ status: BatchStatus; resultsUrl: string | null }> {
    const batch = batchSchema.parse(await (await this.call(`${API}/${id}`)).json());
    return { status: batch.processing_status, resultsUrl: batch.results_url ?? null };
  }

  /** Every request's outcome, once the batch has ended. */
  async results(resultsUrl: string): Promise<BatchResult[]> {
    const text = await (await this.call(resultsUrl)).text();
    return text
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line): BatchResult => {
        const parsed = resultLineSchema.safeParse(JSON.parse(line));
        if (!parsed.success) {
          return { customId: "", ok: false, reason: "unreadable" };
        }
        const { custom_id: customId, result } = parsed.data;
        if (result.type !== "succeeded") {
          return { customId, ok: false, reason: result.type };
        }
        const { content, usage } = result.message;
        return {
          customId,
          ok: true,
          text: content.map((block) => (block.type === "text" ? (block.text ?? "") : "")).join(""),
          inputTokens:
            usage.input_tokens +
            (usage.cache_read_input_tokens ?? 0) +
            (usage.cache_creation_input_tokens ?? 0),
          outputTokens: usage.output_tokens,
          truncated: result.message.stop_reason === "max_tokens",
        };
      });
  }
}
