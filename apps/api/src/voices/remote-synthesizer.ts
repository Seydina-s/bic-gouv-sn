import { spawn } from "node:child_process";
import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { parseSynthesisResults } from "./python-synthesizer";
import type { SynthesisJob, SynthesisResult, Synthesizer } from "./recordings";

/*
 * Our voices on the voice server (Hetzner, docs/guides/creer-le-serveur-ia.md): the
 * texts go there over SSH, services/voices reads them aloud, and the MP3 files come
 * back here, where the store and the media live. The server keeps no content: its
 * working folder is removed after each group.
 *
 * The reading runs on the server by itself (11/10/2026): until then it lived as long
 * as one SSH connection, and stopped whenever this computer slept. This computer now
 * starts it, then comes back every minute for what is ready, and hands each recording
 * over as soon as it is copied; while it sleeps, the server goes on.
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
  /** Time between two looks at the server. */
  pollMs?: number;
  /** The server unreachable this long: the group is given up (and tried again). */
  maxSilenceMs?: number;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Plain absolute paths only: they are placed in a remote shell command. */
const SAFE_PATH = /^\/[\w./-]+$/;
const WORK_DIR = /^\/tmp\/bgs-voices-[\w]+$/;
const RUNNING = "BGS-RUNNING";
/** Copies of one recording tried before it is reported as failed. */
const COPY_ATTEMPTS = 3;

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

/** The options of every ssh call: batch mode, our key only, known server only. */
function sshOptions(keyPath: string): string[] {
  return [
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
}

/**
 * Stops the readings an earlier run left on the server, and removes their folders.
 * A reading goes on by itself when this computer stops the command (a deploy, a
 * restart): on 17/10/2026 four ran at once on four processors, none collected, and
 * the catch-up barely moved. Called once when the command starts; one command at a
 * time reads aloud. The pattern ([.]) never matches this shell's own command line.
 */
export async function clearLeftovers({
  host,
  keyPath,
  run = runProgram,
}: Pick<RemoteSynthesizerOptions, "host" | "keyPath" | "run">): Promise<string> {
  return run("ssh", [
    ...sshOptions(keyPath),
    host,
    "pkill -f 'synthesize[.]py /tmp/bgs-voices-'; rm -rf /tmp/bgs-voices-*; echo cleared",
  ]);
}

export function remoteSynthesizer({
  host,
  keyPath,
  project = "/home/voices/voices",
  models = "/home/voices/models",
  run = runProgram,
  pollMs = 60_000,
  maxSilenceMs = 6 * 60 * 60_000,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}: RemoteSynthesizerOptions): Synthesizer {
  if (!SAFE_PATH.test(project) || !SAFE_PATH.test(models)) {
    throw new Error("voice server paths must be plain absolute paths");
  }
  // Batch mode: never a password prompt. The server's key must already be known
  // (first connection made by hand, docs/guides/creer-le-serveur-ia.md). Only our key
  // is offered: other keys tried first would count as failed logins on the server.
  const options = sshOptions(keyPath);
  const ssh = (command: string, input?: string) => run("ssh", [...options, host, command], input);

  /** Copied next to its place, then moved: never a half file where the app looks. */
  async function copyBack(dir: string, index: number, job: SynthesisJob): Promise<void> {
    const partial = `${job.out}.part`;
    await mkdir(dirname(job.out), { recursive: true });
    await run("scp", ["-q", ...options, `${host}:${dir}/${String(index)}.mp3`, partial]);
    await rename(partial, job.out);
  }

  return async (jobs, onResult) => {
    const dir = (await ssh("mktemp -d /tmp/bgs-voices-XXXXXXXX")).trim();
    if (!WORK_DIR.test(dir)) {
      throw new Error(`unexpected working folder on the voice server: ${dir}`);
    }
    try {
      const remoteJobs = jobs.map((job, index) => ({ ...job, out: `${dir}/${String(index)}.mp3` }));
      await ssh(`cat > ${dir}/jobs.json`, JSON.stringify(remoteJobs));
      // Started apart from this connection: it goes on if this computer sleeps.
      const pid = (
        await ssh(
          `cd ${project} && (nohup .venv/bin/python synthesize.py ${dir}/jobs.json ${models} > ${dir}/results.jsonl 2> ${dir}/voices.log < /dev/null & echo $!)`,
        )
      ).trim();
      if (!/^\d+$/.test(pid)) {
        throw new Error(`the voices did not start on the server: ${pid}`);
      }
      const indexOf = new Map(jobs.map((job, index) => [job.id, { job, index }]));
      const settled = new Map<string, SynthesisResult>();
      const copyFailures = new Map<string, number>();
      let reachedAt = now();
      for (;;) {
        await wait(pollMs);
        let state: string;
        try {
          // Running checked before reading: a result written meanwhile is read next time.
          state = await ssh(
            `if kill -0 ${pid} 2>/dev/null; then echo ${RUNNING}; fi; cat ${dir}/results.jsonl`,
          );
          reachedAt = now();
        } catch (error) {
          if (now() - reachedAt > maxSilenceMs) {
            throw error;
          }
          continue;
        }
        for (const result of parseSynthesisResults(state)) {
          const known = indexOf.get(result.id);
          if (known === undefined || settled.has(result.id)) {
            continue;
          }
          let outcome: SynthesisResult = result;
          if (result.ok) {
            try {
              await copyBack(dir, known.index, known.job);
            } catch (error) {
              const failures = (copyFailures.get(result.id) ?? 0) + 1;
              copyFailures.set(result.id, failures);
              if (failures < COPY_ATTEMPTS) {
                continue;
              }
              outcome = {
                id: result.id,
                ok: false,
                error: `copy from the voice server failed: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          }
          settled.set(result.id, outcome);
          await onResult?.(outcome);
        }
        const running = state.split("\n").some((line) => line.trim() === RUNNING);
        const copyPending = [...copyFailures.keys()].some((id) => !settled.has(id));
        if (!running && !copyPending) {
          break;
        }
      }
      return [...settled.values()];
    } finally {
      await ssh(`rm -rf ${dir}`).catch(() => undefined);
    }
  };
}
