import { withTimeout } from "@bgs/resilience";
import {
  assistantReplySchema,
  type AssistantQuestion,
  type AssistantReply,
} from "@bgs/shared-types";
import type { ApiClientOptions } from "./json-getter";

/** Why a question got no reply, as the screen explains it. */
export type AskFailure = "offline" | "busy" | "closed" | "failed";

export class AskError extends Error {
  constructor(readonly failure: AskFailure) {
    super(failure);
    this.name = "AskError";
  }
}

function failureOf(status: number): AskFailure {
  if (status === 429) {
    return "busy";
  }
  return status === 503 ? "closed" : "failed";
}

/**
 * Talks to /v1/assistant: a question, or a claim to check. Not retried by itself:
 * every question has a cost, and the person can ask again.
 */
export function createAssistantClient({
  baseUrl,
  fetchImpl = (input, init) => fetch(input, init),
  // The model takes a few seconds; the API gives up after 20.
  timeoutMs = 25_000,
}: ApiClientOptions) {
  return {
    ask: async (question: AssistantQuestion): Promise<AssistantReply> => {
      let response: Response;
      try {
        response = await withTimeout(
          (signal) =>
            fetchImpl(`${baseUrl}/v1/assistant/answers`, {
              method: "POST",
              signal,
              headers: { "content-type": "application/json" },
              body: JSON.stringify(question),
            }),
          { timeoutMs },
        );
      } catch {
        throw new AskError("offline");
      }
      if (!response.ok) {
        throw new AskError(failureOf(response.status));
      }
      const reply = assistantReplySchema.safeParse(await response.json().catch(() => null));
      if (!reply.success) {
        throw new AskError("failed");
      }
      return reply.data;
    },
  };
}
