import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileDocument } from "@bgs/content-store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DocumentCounters } from "./document-counters";

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-counters-"));
  path = join(dir, "assistant-counters.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("DocumentCounters", () => {
  it("keeps its counts across restarts, and lets them expire", async () => {
    let now = 1_000;
    const first = new DocumentCounters(fileDocument(path), () => now);
    expect(await first.increment("questions:2026-10", 60_000)).toBe(1);
    expect(await first.increment("questions:2026-10", 60_000, 2)).toBe(3);
    // A new process (the API restarted) reads the same counts back.
    const again = new DocumentCounters(fileDocument(path), () => now);
    expect(await again.get("questions:2026-10")).toBe("3");
    expect(await again.get("unknown")).toBeNull();
    now += 60_000;
    expect(await again.get("questions:2026-10")).toBeNull();
    expect(await again.increment("questions:2026-10", 60_000)).toBe(1);
  });
});
