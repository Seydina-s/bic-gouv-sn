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
    if (!parsed.success) {
      logCause(method, path, `answer out of its schema (${fieldsOf(parsed.error)})`);
      return { ok: false, status: null, code: "ADMIN_API_INVALID_RESPONSE" };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    logCause(method, path, error instanceof Error ? error.message : String(error));
    return { ok: false, status: null, code: "ADMIN_API_UNREACHABLE" };
  }
}

/**
 * The person reads a plain message; the technical cause goes to the console's server
 * log (no content, no personal data), otherwise the failure leaves no trace (03/11/2026).
 */
function logCause(method: string, path: string, cause: string): void {
  process.stderr.write(`Admin API ${method} ${path}: ${cause}\n`);
}

/** The fields that did not match, at most five: enough to find the change, nothing more. */
function fieldsOf(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.code}`)
    .join(", ");
}

/**
 * A picture from the admin API (a report's photo), for the signed-in person only:
 * its bytes, or null when it cannot be had (missing, refused, API away).
 */
export async function adminPicture(path: string, token: string): Promise<ArrayBuffer | null> {
  const apiUrl = readApiUrl(process.env);
  if (apiUrl === null) {
    return null;
  }
  try {
    const response = await withTimeout(
      (signal) =>
        fetch(`${apiUrl}/admin/v1${path}`, {
          signal,
          cache: "no-store",
          headers: { authorization: `Bearer ${token}` },
        }),
      { timeoutMs: 8000 },
    );
    return response.ok && response.headers.get("content-type") === "image/jpeg"
      ? await response.arrayBuffer()
      : null;
  } catch {
    return null;
  }
}
