import { createHash } from "node:crypto";
import type { ErrorCode } from "@bgs/shared-types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { KeyValueStore } from "../shared-state/key-value-store";

/** Header a client sends to make a write safe to repeat (CLAUDE.md §4.5). */
export const IDEMPOTENCY_HEADER = "idempotency-key";
/** Header telling the client the answer is the one given the first time. */
export const REPLAYED_HEADER = "idempotent-replayed";
/** A random key, long enough never to be guessed or to collide. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
/** How long a completed write is remembered: longer than any retry. */
const REMEMBER_MS = 24 * 60 * 60 * 1000;
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const entrySchema = z.object({
  /** What was asked: the same key with another request is refused. */
  fingerprint: z.string(),
  /** Null while the first request is still running. */
  answer: z
    .object({ status: z.int(), contentType: z.string().nullable(), body: z.string() })
    .nullable(),
});
type Entry = z.infer<typeof entrySchema>;

declare module "fastify" {
  interface FastifyRequest {
    /** The remembered key of this write, when it came with one and runs for the first time. */
    idempotencySlot?: string;
    /** The answer was remembered (a success): nothing to clean up afterwards. */
    idempotencyAnswered?: boolean;
  }
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** Keys are private to whoever sent them: a session, or else an address. */
function scopeOf(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  return authorization === undefined ? `ip:${request.ip}` : `session:${sha256(authorization)}`;
}

function fingerprintOf(request: FastifyRequest): string {
  return sha256(`${request.method} ${request.url} ${JSON.stringify(request.body ?? null)}`);
}

function refuse(request: FastifyRequest, reply: FastifyReply, status: number, code: ErrorCode) {
  return reply.code(status).send({ code, message: code, requestId: request.id });
}

function readEntry(raw: string | null): Entry | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed = entrySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Idempotency keys on every write (CLAUDE.md §4.5): a write sent again with the
 * same key (a double submission, a retry after a lost answer) is not done twice;
 * the first answer is given again. Only successful answers are remembered: after
 * a refusal or a failure, nothing was written and the retry really runs. The keys
 * live in the shared state (SCALE-01): claiming one is atomic, so two instances
 * never both run the same write.
 */
export function registerIdempotency(app: FastifyInstance, state: KeyValueStore): void {
  const keyOf = (slot: string) => `idempotency:${slot}`;

  app.addHook("preHandler", async (request, reply) => {
    const key = request.headers[IDEMPOTENCY_HEADER];
    if (!WRITES.has(request.method) || key === undefined) {
      return;
    }
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      return refuse(request, reply, 400, "IDEMPOTENCY_KEY_INVALID");
    }
    const slot = keyOf(`${scopeOf(request)}:${key}`);
    const fingerprint = fingerprintOf(request);
    const pending: Entry = { fingerprint, answer: null };
    if (await state.setIfAbsent(slot, JSON.stringify(pending), REMEMBER_MS)) {
      request.idempotencySlot = slot;
      return;
    }
    const known = readEntry(await state.get(slot));
    if (known === null) {
      // Expired or damaged between the two reads: treated as still running.
      return refuse(request, reply, 409, "IDEMPOTENCY_IN_PROGRESS");
    }
    if (known.fingerprint !== fingerprint) {
      return refuse(request, reply, 422, "IDEMPOTENCY_KEY_REUSED");
    }
    if (known.answer === null) {
      return refuse(request, reply, 409, "IDEMPOTENCY_IN_PROGRESS");
    }
    void reply.header(REPLAYED_HEADER, "true");
    if (known.answer.contentType !== null) {
      void reply.header("content-type", known.answer.contentType);
    }
    return reply.code(known.answer.status).send(known.answer.body);
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const slot = request.idempotencySlot;
    if (slot === undefined) {
      return payload;
    }
    const status = reply.statusCode;
    if (status >= 200 && status < 300) {
      const contentType = reply.getHeader("content-type");
      const done: Entry = {
        fingerprint: fingerprintOf(request),
        answer: {
          status,
          contentType: typeof contentType === "string" ? contentType : null,
          // Writes answer JSON, or nothing at all (204).
          body: typeof payload === "string" ? payload : "",
        },
      };
      await state.set(slot, JSON.stringify(done), REMEMBER_MS);
      request.idempotencyAnswered = true;
    } else {
      // Refused or failed: nothing was written, a retry must really run.
      await state.delete(slot);
    }
    return payload;
  });

  // An answer that never went out (connection closed, crash) leaves no stuck key.
  app.addHook("onResponse", async (request) => {
    if (request.idempotencySlot !== undefined && request.idempotencyAnswered !== true) {
      await state.delete(request.idempotencySlot);
    }
  });
}
