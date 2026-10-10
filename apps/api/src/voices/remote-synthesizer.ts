import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { parseSynthesisResults } from "./python-synthesizer";
import type { SynthesisResult, Synthesizer } from "./recordings";

/*
 * Our voices on the voice server (Hetzner, docs/guides/creer-le-serveur-ia.md): the
 * texts go there over SSH, services/voices reads them aloud, and the MP3 files come
 * back here, where the store and the media live. The server keeps no content: its
 * working folder is removed after each group.
 */

/** Runs a program with optional standard input; resolves with its standard output. */
export type Run = (program: string, args: readonly string[], input?: string) => Promise<string>;

export interface RemoteSynthesizerOptions {
  /** "user@address" of the voice server. */
  host: string;
  /** Private key file allowed on the server (never read here, given to ssh). */
  keyPath: string;
  /** services/voices on the server, with its .venv. */
  project?: string;
  /** Where the server keeps the voice models. */
  models?: string;
  run?: Run;
}

/** Plain absolute paths only: they are placed in a remote shell command. */
const SAFE_PATH = /^\/[\w./-]+$/;
const WORK_DIR = /^\/tmp\/bgs-voices-[\w]+$/;

const runProgram: Run = (program, args, input) =>
  new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["pipe", "pipe", "inherit"] });
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
        reject(new Error(`${program} exited with ${String(code)}`));
      }
    });
    child.stdin.end(input ?? "");
  });

export function remoteSynthesizer({
  host,
  keyPath,
  project = "/home/voices/voices",
  models = "/home/voices/models",
  run = runProgram,
}: RemoteSynthesizerOptions): Synthesizer {
  if (!SAFE_PATH.test(project) || !SAFE_PATH.test(models)) {
    throw new Error("voice server paths must be plain absolute paths");
  }
  // Batch mode: never a password prompt. The server's key must already be known
  // (first connection made by hand, docs/guides/creer-le-serveur-ia.md). Only our key
  // is offered: other keys tried first would count as failed logins on the server.
  const options = [
    "-i",
    keyPath,
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "ConnectTimeout=30",
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=yes",
    "-o",
    "ServerAliveInterval=60",
  ];
  const ssh = (command: string, input?: string) => run("ssh", [...options, host, command], input);

  return async (jobs) => {
    const dir = (await ssh("mktemp -d /tmp/bgs-voices-XXXXXXXX")).trim();
    if (!WORK_DIR.test(dir)) {
      throw new Error(`unexpected working folder on the voice server: ${dir}`);
    }
    try {
      const remoteJobs = jobs.map((job, index) => ({ ...job, out: `${dir}/${String(index)}.mp3` }));
      await ssh(`cat > ${dir}/jobs.json`, JSON.stringify(remoteJobs));
      const results = parseSynthesisResults(
        await ssh(`cd ${project} && .venv/bin/python synthesize.py ${dir}/jobs.json ${models}`),
      );
      const outById = new Map(jobs.map((job, index) => [job.id, { job, index }]));
      const fetched: SynthesisResult[] = [];
      for (const result of results) {
        const known = outById.get(result.id);
        if (known === undefined || !result.ok) {
          fetched.push(result);
          continue;
        }
        try {
          // Copied next to its place, then moved: never a half file where the app looks.
          const partial = `${known.job.out}.part`;
          await mkdir(dirname(known.job.out), { recursive: true });
          await run("scp", [
            "-q",
            ...options,
            `${host}:${dir}/${String(known.index)}.mp3`,
            partial,
          ]);
          await rename(partial, known.job.out);
          fetched.push(result);
        } catch (error) {
          fetched.push({
            id: result.id,
            ok: false,
            error: `copy from the voice server failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
      return fetched;
    } finally {
      await ssh(`rm -rf ${dir}`).catch(() => undefined);
    }
  };
}
