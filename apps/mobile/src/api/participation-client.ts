import { withTimeout } from "@bgs/resilience";
import type { MessageSubmission, ReportSubmission } from "@bgs/shared-types";
import type { ApiClientOptions } from "./json-getter";

/** Why a sending did not go through, as the screen explains it. */
export type SendFailure = "offline" | "busy" | "closed" | "photo" | "failed";

export class SendError extends Error {
  constructor(readonly failure: SendFailure) {
    super(failure);
    this.name = "SendError";
  }
}

function failureOf(status: number): SendFailure {
  if (status === 429) {
    return "busy";
  }
  if (status === 503) {
    return "closed";
  }
  return status === 422 ? "photo" : "failed";
}

/**
 * Talks to /v1/participation: a message to the government, or a report. Each one
 * carries a key drawn once: sent twice (a retry after a lost answer), it is kept once.
 */
export function createParticipationClient({
  baseUrl,
  fetchImpl = (input, init) => fetch(input, init),
  // A photo over a slow network takes time.
  timeoutMs = 60_000,
}: ApiClientOptions) {
  const post = async (path: string, body: object, key: string): Promise<void> => {
    let response: Response;
    try {
      response = await withTimeout(
        (signal) =>
          fetchImpl(`${baseUrl}/v1/participation/${path}`, {
            method: "POST",
            signal,
            headers: { "content-type": "application/json", "idempotency-key": key },
            body: JSON.stringify(body),
          }),
        { timeoutMs },
      );
    } catch {
      throw new SendError("offline");
    }
    if (!response.ok) {
      throw new SendError(failureOf(response.status));
    }
  };
  return {
    sendMessage: (message: MessageSubmission, key: string) => post("messages", message, key),
    sendReport: (report: ReportSubmission, key: string) => post("reports", report, key),
  };
}
