import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_REMOTE_CONFIG } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RemoteConfigStore } from "./remote-config-store";
import { fileDocument } from "./json-document";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-remote-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("RemoteConfigStore", () => {
  it("has everything on until the console changes it, then keeps the change", async () => {
    const store = new RemoteConfigStore(fileDocument(join(dir, "remote-config.json")));
    expect(await store.read()).toEqual(DEFAULT_REMOTE_CONFIG);
    const changed = {
      minVersion: "1.1.0",
      features: { ...DEFAULT_REMOTE_CONFIG.features, map: false },
    };
    await store.write(changed);
    expect(
      await new RemoteConfigStore(fileDocument(join(dir, "remote-config.json"))).read(),
    ).toEqual(changed);
  });

  it("reads a file saved before a feature was added: the new one is on", async () => {
    const path = join(dir, "remote-config.json");
    await writeFile(
      path,
      JSON.stringify({ minVersion: null, features: { map: false, droppedLongAgo: true } }),
    );
    expect(await new RemoteConfigStore(fileDocument(path)).read()).toEqual({
      minVersion: null,
      features: { ...DEFAULT_REMOTE_CONFIG.features, map: false },
    });
  });

  it("refuses a malformed file instead of guessing", async () => {
    const path = join(dir, "remote-config.json");
    await writeFile(path, JSON.stringify({ minVersion: "v1", features: {} }));
    await expect(new RemoteConfigStore(fileDocument(path)).read()).rejects.toThrow();
  });
});
