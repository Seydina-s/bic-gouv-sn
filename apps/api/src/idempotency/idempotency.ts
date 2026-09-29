import { createHash } from "node:crypto";
import type { ErrorCode } from "@bgs/shared-types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** Header a client sends to make a write safe to repeat (CLAUDE.md §4.5). */
export const IDEMPOTENCY_HEADER = "idempotency-key";
/** Header telling the client the answer is the one given the first time. */
export const REPLAYED_HEADER = "idempotent-replayed";
/** A random key, long enough never to be guessed or to collide. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
/** How long a completed write is remembered: longer than any retry. */
const REMEMBER_MS = 24 * 60 * 60 * 1000;
/** Keys remembered at most; beyond, the oldest give way (memory stays bounded). */
const MAX_KEYS = 10_000;
const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface Entry {
  /** What was asked: the same key with another request is refused. */
  fingerprint: string;
  expiresAt: number;
  /** Null while the first request is still running. */
  answer: { status: number; contentType: string | null; body: string } | null;
}

declare module "fastify" {
  interface FastifyRequest {
    /** The remembered key of this write, when it came with one and runs for the first time. */
    idempotencySlot?: string;
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

/**
 * Idempotency keys on every write (CLAUDE.md §4.5): a write sent again with the
 * same key (a double submission, a retry after a lost answer) is not done twice;
 * the first answer is given again. Only successful answers are remembered: after
 * a refusal or a failure, nothing was written and the retry really runs. Kept in
 * memory: a restart forgets the keys (a shared store when the API has several
 * instances, like the sessions).
 */
export function registerIdempotency(app: FastifyInstance, now: () => number = Date.now): void {
  const entries = new Map<string, Entry>();

  const forgetExpired = (time: number) => {
    for (const [slot, entry] of entries) {
      if (entry.expiresAt > time && entries.size <= MAX_KEYS) {
        break;
      }
      entries.delete(slot);
    }
  };

  app.addHook("preHandler", async (request, reply) => {
    const key = request.headers[IDEMPOTENCY_HEADER];
    if (!WRITES.has(request.method) || key === undefined) {
      return;
    }
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
      return refuse(request, reply, 400, "IDEMPOTENCY_KEY_INVALID");
    }
    const time = now();
    forgetExpired(time);
    const slot = `${scopeOf(request)}:${key}`;
    const fingerprint = fingerprintOf(request);
    const known = entries.get(slot);
    if (known !== undefined) {
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
    }
    entries.set(slot, { fingerprint, expiresAt: time + REMEMBER_MS, answer: null });
    request.idempotencySlot = slot;
  });

  app.addHook("onSend", (request, reply, payload, done) => {
    const slot = request.idempotencySlot;
    if (slot !== undefined) {
      const entry = entries.get(slot);
      const status = reply.statusCode;
      if (entry !== undefined && status >= 200 && status < 300) {
        const contentType = reply.getHeader("content-type");
        entry.answer = {
          status,
          contentType: typeof contentType === "string" ? contentType : null,
          // Writes answer JSON, or nothing at all (204).
          body: typeof payload === "string" ? payload : "",
        };
      } else {
        // Refused or failed: nothing was written, a retry must really run.
        entries.delete(slot);
      }
    }
    done(null, payload);
  });

  // An answer that never went out (connection closed, crash) leaves no stuck key.
  app.addHook("onResponse", (request, _reply, done) => {
    const slot = request.idempotencySlot;
    if (slot !== undefined && entries.get(slot)?.answer === null) {
      entries.delete(slot);
    }
    done();
  });
}
