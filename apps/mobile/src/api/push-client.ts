import { withTimeout } from "@bgs/resilience";
import type { PushSubscription } from "@bgs/shared-types";
import { type ApiClientOptions, NewsApiError } from "./json-getter";

/**
 * Talks to /v1/push/subscription: which sections this phone follows, its quiet
 * hours and its language, tied only to its Expo push token (nothing about who
 * holds the phone). Both calls can be repeated safely: the last one wins.
 */
export function createPushClient({
  baseUrl,
  fetchImpl = (input, init) => fetch(input, init),
  timeoutMs = 10_000,
}: ApiClientOptions) {
  const call = async (method: "PUT" | "DELETE", body: object): Promise<void> => {
    const response = await withTimeout(
      (signal) =>
        fetchImpl(`${baseUrl}/v1/push/subscription`, {
          method,
          signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      { timeoutMs },
    );
    if (!response.ok) {
      throw new NewsApiError(
        response.status,
        `${method} /v1/push/subscription failed with HTTP ${String(response.status)}`,
      );
    }
  };
  return {
    subscribe: (subscription: PushSubscription) => call("PUT", subscription),
    unsubscribe: (token: string) => call("DELETE", { token }),
  };
}
