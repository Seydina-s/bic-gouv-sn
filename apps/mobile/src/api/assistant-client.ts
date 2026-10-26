import { withTimeout } from "@bgs/resilience";
import {
  readAssistantReply,
  type AssistantFlagSubmission,
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

/** A flag is a small write: no model behind it. */
const FLAG_TIMEOUT_MS = 15_000;

/**
 * Talks to /v1/assistant: a question, or a claim to check. Not retried by itself:
 * every question has a cost, and the person can ask again.
 */
export function createAssistantClient({
  baseUrl,
  fetchImpl = (input, init) => fetch(input, init),
  // The model takes a few seconds; the API gives up after two attempts of 13.
  timeoutMs = 35_000,
}: ApiClientOptions) {
  const post = async (path: string, body: unknown, limitMs: number): Promise<Response> => {
    let response: Response;
    try {
      response = await withTimeout(
        (signal) =>
          fetchImpl(`${baseUrl}${path}`, {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        { timeoutMs: limitMs },
      );
    } catch {
      throw new AskError("offline");
    }
    if (!response.ok) {
      throw new AskError(failureOf(response.status));
    }
    return response;
  };
  return {
    ask: async (question: AssistantQuestion): Promise<AssistantReply> => {
      const response = await post("/v1/assistant/answers", question, timeoutMs);
      const reply = readAssistantReply(await response.json().catch(() => null));
      if (reply === null) {
        throw new AskError("failed");
      }
      return reply;
    },
    /** « Signaler cette réponse »: only what the person chose to send (AST-30e). */
    flag: async (submission: AssistantFlagSubmission): Promise<void> => {
      await post("/v1/assistant/flags", submission, FLAG_TIMEOUT_MS);
    },
  };
}
