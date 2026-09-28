import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { VersionedJsonStore } from "./versioned-json-store";

const itemSchema = z.object({
  id: z.string(),
  contentHash: z.string(),
  version: z.int(),
  text: z.string(),
});
type Item = z.infer<typeof itemSchema>;
const item = (id: string, text: string): Item => ({ id, contentHash: text, version: 1, text });

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-versioned-"));
  path = join(dir, "items.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("VersionedJsonStore", () => {
  it("sees what another process wrote since its last read", async () => {
    const reader = new VersionedJsonStore(path, itemSchema, "items");
    const writer = new VersionedJsonStore(path, itemSchema, "items");
    await writer.save(item("a", "un"));
    expect((await reader.get("a"))?.text).toBe("un");
    await writer.save(item("a", "deux"));
    expect((await reader.get("a"))?.text).toBe("deux");
    expect((await reader.history("a")).map((old) => old.text)).toEqual(["un"]);
  });

  it("never changes what a reader already holds when it writes", async () => {
    const store = new VersionedJsonStore(path, itemSchema, "items");
    await store.save(item("a", "un"));
    const before = await store.entries();
    await store.save(item("b", "autre"));
    await store.replaceCurrent("a", (current) => ({ ...current, text: "modifié" }));
    expect(Object.keys(before)).toEqual(["a"]);
    expect(before["a"]?.current.text).toBe("un");
    expect((await store.get("a"))?.text).toBe("modifié");
  });

  it("still refuses a file that became invalid, and falls back on its backup", async () => {
    const store = new VersionedJsonStore(path, itemSchema, "items");
    await store.save(item("a", "un"));
    await store.get("a");
    await writeFile(path, JSON.stringify({ schemaVersion: 1, items: { a: { current: {} } } }));
    expect((await store.get("a"))?.text).toBe("un");
  });
});
