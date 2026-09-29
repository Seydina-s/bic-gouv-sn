import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IDEMPOTENCY_HEADER, REPLAYED_HEADER, registerIdempotency } from "./idempotency";

const KEY = "cle-de-test-idempotence";
const DAY_MS = 24 * 60 * 60 * 1000;

let app: FastifyInstance;
let writes: number;
let time: number;
let release: () => void;

beforeEach(async () => {
  writes = 0;
  time = Date.parse("2026-09-29T08:00:00Z");
  app = Fastify();
  registerIdempotency(app, () => time);
  app.post("/write", (request) => {
    writes += 1;
    return { writes, body: request.body };
  });
  app.post("/refused", async (_request, reply) => {
    writes += 1;
    return reply.code(409).send({ code: "NOTIFICATION_NOT_PENDING" });
  });
  app.post("/slow", async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    writes += 1;
    return { writes };
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

const send = (url: string, key: string | null, payload: object = { article: 1 }, session = "a") =>
  app.inject({
    method: "POST",
    url,
    payload,
    headers: {
      authorization: `Bearer session-${session}`,
      ...(key === null ? {} : { [IDEMPOTENCY_HEADER]: key }),
    },
  });

describe("idempotency keys on writes", () => {
  it("does a write sent twice with the same key only once, and answers the same", async () => {
    const first = await send("/write", KEY);
    const second = await send("/write", KEY);
    expect(writes).toBe(1);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(second.headers[REPLAYED_HEADER]).toBe("true");
    expect(first.headers[REPLAYED_HEADER]).toBeUndefined();
  });

  it("does every write sent without a key", async () => {
    await send("/write", null);
    await send("/write", null);
    expect(writes).toBe(2);
  });

  it("refuses a key used again for another request", async () => {
    await send("/write", KEY, { article: 1 });
    const other = await send("/write", KEY, { article: 2 });
    expect(other.statusCode).toBe(422);
    expect(other.json()).toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
    expect(writes).toBe(1);
  });

  it("keeps each person's keys apart", async () => {
    await send("/write", KEY, { article: 1 }, "a");
    await send("/write", KEY, { article: 1 }, "b");
    expect(writes).toBe(2);
  });

  it("lets a refused write be tried again for real", async () => {
    await send("/refused", KEY);
    await send("/refused", KEY);
    expect(writes).toBe(2);
  });

  it("answers a repeat that arrives while the first is still running", async () => {
    const first = send("/slow", KEY);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const repeat = await send("/slow", KEY);
    expect(repeat.statusCode).toBe(409);
    expect(repeat.json()).toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });
    release();
    expect((await first).statusCode).toBe(200);
    expect(writes).toBe(1);
  });

  it("refuses a malformed key before writing", async () => {
    const response = await send("/write", "trop court");
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "IDEMPOTENCY_KEY_INVALID" });
    expect(writes).toBe(0);
  });

  it("forgets a key after a day", async () => {
    await send("/write", KEY);
    time += DAY_MS + 1;
    await send("/write", KEY);
    expect(writes).toBe(2);
  });
});
