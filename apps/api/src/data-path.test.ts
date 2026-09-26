import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveDataPath, workspaceRoot } from "./data-path";

let outside: string;

beforeAll(async () => {
  outside = await mkdtemp(join(tmpdir(), "bgs-no-workspace-"));
  await mkdir(join(outside, "nested"), { recursive: true });
});

afterAll(async () => {
  await rm(outside, { recursive: true, force: true });
});

describe("data paths", () => {
  const root = workspaceRoot(process.cwd()) ?? "";

  // Regression (26/09/2026): an account created from apps/api was invisible to the server.
  it("points at the same files from the project root and from apps/api", () => {
    const fromRoot = resolveDataPath(".data/admin/accounts.json", root);
    const fromApi = resolveDataPath(".data/admin/accounts.json", join(root, "apps", "api"));
    expect(fromApi).toBe(fromRoot);
    expect(fromRoot).toBe(join(root, ".data", "admin", "accounts.json"));
  });

  it("keeps an absolute path as given", () => {
    const absolute = resolve(outside, "store.json");
    expect(resolveDataPath(absolute, root)).toBe(absolute);
  });

  it("uses the start folder outside the monorepo (deployed image)", () => {
    const start = join(outside, "nested");
    expect(workspaceRoot(start)).toBeNull();
    expect(resolveDataPath(".data/x.json", start)).toBe(join(start, ".data", "x.json"));
  });
});
