import { z } from "zod";

const apiUrlSchema = z.url({ protocol: /^https?$/ });

/**
 * Base URL of the public API, read at request time from the environment.
 * Returns null when missing or invalid, so the page can explain it instead of crashing.
 */
export function readApiUrl(env: Readonly<Record<string, string | undefined>>): string | null {
  const result = apiUrlSchema.safeParse(env["API_URL"]);
  return result.success ? result.data.replace(/\/+$/, "") : null;
}
