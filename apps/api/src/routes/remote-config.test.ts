import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileRemoteConfigStore } from "@bgs/content-store";
import { DEFAULT_REMOTE_CONFIG } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-remote-"));
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    remoteConfig: new FileRemoteConfigStore(join(dir, "remote-config.json")),
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const put = (token: string, payload: object) =>
  app.inject({
    method: "PUT",
    url: "/admin/v1/remote-config",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

describe("remote control of the apps", () => {
  it("tells every app what is on, everything until the console says otherwise", async () => {
    const answer = await app.inject({ method: "GET", url: "/v1/remote-config" });
    expect(answer.json()).toEqual(DEFAULT_REMOTE_CONFIG);
    expect(answer.headers["cache-control"]).toBe("public, max-age=60");
  });

  it("lets an admin switch a feature off and set a minimum version, journaled", async () => {
    const changed = {
      minVersion: "1.2.0",
      features: { ...DEFAULT_REMOTE_CONFIG.features, map: false },
    };
    expect((await put(await admin.tokenFor("admin"), changed)).json()).toEqual({ saved: true });
    expect((await app.inject({ method: "GET", url: "/v1/remote-config" })).json()).toEqual(changed);
    const [entry] = (await admin.journal.entries()).filter(
      (item) => item.action === "remote-config.changed",
    );
    expect(entry?.details).toEqual({ minVersion: "1.2.0", off: "map" });
  });

  it("refuses an editor, and a malformed setting", async () => {
    expect((await put(await admin.tokenFor("editor"), DEFAULT_REMOTE_CONFIG)).statusCode).toBe(403);
    const token = await admin.tokenFor("admin");
    expect((await put(token, { minVersion: "v2", features: {} })).statusCode).toBe(400);
    expect((await app.inject({ method: "GET", url: "/v1/remote-config" })).json()).toEqual(
      DEFAULT_REMOTE_CONFIG,
    );
  });
});
