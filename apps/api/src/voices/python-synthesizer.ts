import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { Synthesizer } from "./recordings";

/*
 * Our voices run in Python (services/voices): a separate process per group of
 * recordings, never inside the API serving the app (CLAUDE.md §4.5, bulkhead).
 */

const resultSchema = z.union([
  z.object({
    id: z.string(),
    ok: z.literal(true),
    durationMs: z.int().positive(),
    bytes: z.int().positive(),
    voiceId: z.string().min(1),
  }),
  z.object({ id: z.string(), ok: z.literal(false), error: z.string() }),
]);

export interface PythonSynthesizerOptions {
  /** services/voices: its uv project and synthesize.py. */
  project: string;
  /** Where the voice models are kept (downloaded once). */
  models: string;
  /** The uv program. */
  uv?: string;
}

export function pythonSynthesizer({
  project,
  models,
  uv = "uv",
}: PythonSynthesizerOptions): Synthesizer {
  return async (jobs) => {
    const dir = await mkdtemp(join(tmpdir(), "bgs-voices-"));
    const file = join(dir, "jobs.json");
    await writeFile(file, JSON.stringify(jobs), "utf8");
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(
          uv,
          ["run", "--project", project, "python", join(project, "synthesize.py"), file, models],
          {
            cwd: project,
            stdio: ["ignore", "pipe", "inherit"],
          },
        );
        let stdout = "";
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`voices exited with ${String(code)}`));
          }
        });
      });
      return output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("{"))
        .flatMap((line) => {
          const parsed = resultSchema.safeParse(JSON.parse(line));
          return parsed.success ? [parsed.data] : [];
        });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}
