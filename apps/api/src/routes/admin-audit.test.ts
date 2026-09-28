import { auditResponseSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
});

const read = async (token: string) =>
  app.inject({
    method: "GET",
    url: "/admin/v1/audit",
    headers: { authorization: `Bearer ${token}` },
  });

describe("GET /admin/v1/audit", () => {
  it("shows administrators the latest actions, with names, and an intact chain", async () => {
    await admin.tokenFor("editor");
    const response = await read(await admin.tokenFor("admin"));
    expect(response.statusCode).toBe(200);
    const audit = auditResponseSchema.parse(response.json());
    expect(audit.intact).toBe(true);
    expect(audit.firstBrokenAt).toBeNull();
    expect(audit.total).toBe(audit.entries.length);
    // Latest first: the administrator's own sign-in comes before the editor's.
    const signIns = audit.entries.filter((entry) => entry.action === "sign-in");
    expect(signIns.map((entry) => entry.actorName)).toEqual(["admin", "editor"]);
  });

  it("is for administrators only", async () => {
    expect((await read(await admin.tokenFor("editor"))).statusCode).toBe(403);
  });
});
