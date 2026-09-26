import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IngestionStatus } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readIngestionStatus, writeIngestionStatus } from "./ingestion-status-file";

const STATUS: IngestionStatus = {
  checkedAt: "2026-09-26T10:00:00.000Z",
  lastSuccessAt: "2026-09-26T10:00:00.000Z",
  lastChangeAt: null,
  lastDetectionSeconds: null,
  consecutiveFailures: 0,
  lastFailure: null,
};

describe("ingestion status file", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-status-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips, and reads a missing or damaged report as none", async () => {
    const path = join(dir, "nested", "status.json");
    expect(await readIngestionStatus(path)).toBeNull();
    await writeIngestionStatus(path, STATUS);
    expect(await readIngestionStatus(path)).toEqual(STATUS);
    await writeFile(path, "{broken");
    expect(await readIngestionStatus(path)).toBeNull();
    await writeFile(path, JSON.stringify({ ...STATUS, consecutiveFailures: -1 }));
    expect(await readIngestionStatus(path)).toBeNull();
  });
});
