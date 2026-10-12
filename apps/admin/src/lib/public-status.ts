import { withTimeout } from "@bgs/resilience";
import type { z } from "zod";

export interface PublicStatusOptions {
  apiUrl: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * One of the API's public reports (`/v1/status/...`), as `schema` describes its
 * answer. Null when the API address is unset, the API is unreachable or answers
 * something unexpected: the API card already explains an API problem.
 */
export async function readPublicStatus<T>(
  path: string,
  schema: z.ZodType<T>,
  { apiUrl, fetchImpl = fetch, timeoutMs = 3000 }: PublicStatusOptions,
): Promise<T | null> {
  if (apiUrl === null) {
    return null;
  }
  try {
    return await withTimeout(
      async (signal) => {
        const response = await fetchImpl(`${apiUrl}${path}`, { signal, cache: "no-store" });
        const parsed = schema.safeParse(await response.json().catch(() => null));
        return response.ok && parsed.success ? parsed.data : null;
      },
      { timeoutMs },
    );
  } catch {
    return null;
  }
}
