import { healthResponseSchema } from "@bgs/shared-types";
import { retry, withTimeout } from "@bgs/resilience";

export type ApiStatus =
  | { state: "up"; checkedAt: Date; version: string; uptimeSeconds: number }
  | { state: "down"; checkedAt: Date }
  | { state: "invalid"; checkedAt: Date }
  | { state: "unconfigured"; checkedAt: Date };

export interface ApiStatusOptions {
  apiUrl: string | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

class InvalidHealthResponse extends Error {}

/**
 * Probes GET /v1/health. No circuit breaker here on purpose: this screen must show
 * the live state on every check, not a paused one. One quick retry absorbs a blip.
 */
export async function getApiStatus({
  apiUrl,
  fetchImpl = fetch,
  now = () => new Date(),
  timeoutMs = 3000,
}: ApiStatusOptions): Promise<ApiStatus> {
  if (apiUrl === null) {
    return { state: "unconfigured", checkedAt: now() };
  }
  const probe = () =>
    withTimeout(
      async (signal) => {
        const response = await fetchImpl(`${apiUrl}/v1/health`, { signal, cache: "no-store" });
        const parsed = healthResponseSchema.safeParse(await response.json().catch(() => null));
        if (!response.ok || !parsed.success) {
          throw new InvalidHealthResponse();
        }
        return parsed.data;
      },
      { timeoutMs },
    );

  try {
    const health = await retry(probe, {
      idempotent: true,
      maxAttempts: 2,
      baseDelayMs: 200,
      maxDelayMs: 200,
      shouldRetry: (error) => !(error instanceof InvalidHealthResponse),
    });
    return {
      state: "up",
      checkedAt: now(),
      version: health.version,
      uptimeSeconds: health.uptimeSeconds,
    };
  } catch (error) {
    const state = error instanceof InvalidHealthResponse ? "invalid" : "down";
    return { state, checkedAt: now() };
  }
}
