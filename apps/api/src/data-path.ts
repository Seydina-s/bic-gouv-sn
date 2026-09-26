import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

/** The monorepo root (folder holding pnpm-workspace.yaml) above `from`, if any. */
export function workspaceRoot(from: string): string | null {
  let folder = resolve(from);
  for (;;) {
    if (existsSync(join(folder, "pnpm-workspace.yaml"))) {
      return folder;
    }
    const parent = dirname(folder);
    if (parent === folder) {
      return null;
    }
    folder = parent;
  }
}

/**
 * Data paths are read from the project root, whatever folder a command starts in:
 * the server and the command-line tools then always use the same files (ERREURS.md,
 * 26/09/2026: an admin account created under apps/api was invisible to the server).
 * Absolute paths are kept; outside the monorepo (deployed image), the start folder.
 */
export function resolveDataPath(path: string, from: string = process.cwd()): string {
  return isAbsolute(path) ? path : resolve(workspaceRoot(from) ?? from, path);
}
