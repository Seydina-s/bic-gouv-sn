import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { usageReportSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";
import { UsageStats } from "../usage/usage-stats";

const ACTIVE = {
  type: "active",
  firstThisWeek: true,
  firstThisMonth: true,
  firstEver: true,
  returnedAfterDays: null,
  platform: "android",
  osVersion: "14",
  appVersion: "1.0.0",
};

let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
    usageStats: await UsageStats.open(join(tmpdir(), "bgs-usage", `${randomUUID()}.json`)),
  });
});

afterEach(async () => {
  await app.close();
});

const signal = (payload: unknown) =>
  app.inject({ method: "POST", url: "/v1/stats", payload: payload as object });

describe("anonymous usage signals", () => {
  it("are counted, and the console sees only totals", async () => {
    expect((await signal({ signals: [ACTIVE] })).statusCode).toBe(204);
    const token = await admin.tokenFor("reviewer");
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/usage",
      headers: { authorization: `Bearer ${token}` },
    });
    const report = usageReportSchema.parse(response.json());
    expect(report).toMatchObject({ activeToday: 1, activeThisWeek: 1, newLast7Days: 1 });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("refuse anything that could carry an identifier", async () => {
    const withId = { signals: [{ ...ACTIVE, deviceId: "abc" }] };
    expect((await signal(withId)).statusCode).toBe(400);
    expect((await signal({ signals: [{ ...ACTIVE, osVersion: "14.2 build x" }] })).statusCode).toBe(
      400,
    );
    expect((await signal({ signals: [] })).statusCode).toBe(400);
    const tooMany = { signals: Array.from({ length: 21 }, () => ACTIVE) };
    expect((await signal(tooMany)).statusCode).toBe(400);
  });

  it("keep the dashboards for signed-in people", async () => {
    const response = await app.inject({ method: "GET", url: "/admin/v1/usage" });
    expect(response.statusCode).toBe(401);
  });
});
