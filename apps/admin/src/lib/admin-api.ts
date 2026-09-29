import "server-only";
import { withTimeout } from "@bgs/resilience";
import type { z } from "zod";
import { readApiUrl } from "./config";

export type AdminResult<T> =
  | { ok: true; data: T }
  /** status null: the API could not be reached (or answered something unreadable). */
  | { ok: false; status: number | null; code: string | null };

interface AdminRequest<S extends z.ZodType> {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  /** Session token of the signed-in person (never sent to the browser). */
  token?: string | null;
  /** Makes a creating write safe to send twice: the API does it only once. */
  idempotencyKey?: string | null;
  schema: S;
}

/**
 * Calls the admin API (/admin/v1) from the console's server only. Every answer is
 * validated; failures come back as values, never as exceptions, so screens can
 * explain them in plain words.
 */
export async function adminRequest<S extends z.ZodType>({
  path,
  method = "GET",
  body,
  token = null,
  idempotencyKey = null,
  schema,
}: AdminRequest<S>): Promise<AdminResult<z.infer<S>>> {
  const apiUrl = readApiUrl(process.env);
  if (apiUrl === null) {
    return { ok: false, status: null, code: "ADMIN_API_UNCONFIGURED" };
  }
  try {
    const response = await withTimeout(
      (signal) =>
        fetch(`${apiUrl}/admin/v1${path}`, {
          method,
          signal,
          cache: "no-store",
          headers: {
            ...(body === undefined ? {} : { "content-type": "application/json" }),
            ...(token === null ? {} : { authorization: `Bearer ${token}` }),
            ...(idempotencyKey === null ? {} : { "idempotency-key": idempotencyKey }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      { timeoutMs: 8000 },
    );
    if (response.status === 204) {
      return { ok: true, data: schema.parse(null) };
    }
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code =
        typeof json === "object" && json !== null && typeof Reflect.get(json, "code") === "string"
          ? (Reflect.get(json, "code") as string)
          : null;
      return { ok: false, status: response.status, code };
    }
    const parsed = schema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, status: null, code: "ADMIN_API_INVALID_RESPONSE" };
  } catch {
    return { ok: false, status: null, code: "ADMIN_API_UNREACHABLE" };
  }
}
