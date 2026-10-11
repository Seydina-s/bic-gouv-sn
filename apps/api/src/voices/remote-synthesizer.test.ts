import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SynthesisJob, SynthesisResult } from "./recordings";
import { remoteSynthesizer, type Run } from "./remote-synthesizer";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-remote-voices-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const WORK = "/tmp/bgs-voices-Ab12Cd34";

const ok = (id: string) => ({ id, ok: true, durationMs: 1000, bytes: 3, voiceId: "adia-tts" });

/**
 * A voice server reading in the background: each look at it shows one more result,
 * and the reading ends after the last. `unreachable` looks fail first; `copyFails`
 * makes every copy back fail.
 */
function server(options: { unreachable?: number; copyFails?: boolean; failing?: string } = {}) {
  const commands: string[] = [];
  let sentJobs: SynthesisJob[] = [];
  let looks = 0;
  let unreachable = options.unreachable ?? 0;
  const run: Run = async (program, args, input) => {
    const last = args.at(-1) ?? "";
    if (program === "scp") {
      if (options.copyFails === true) {
        throw new Error("scp exited with 1");
      }
      await writeFile(last, "mp3");
      return "";
    }
    commands.push(last);
    if (last.startsWith("mktemp")) {
      return `${WORK}\n`;
    }
    if (last.startsWith("cat >")) {
      sentJobs = JSON.parse(input ?? "[]") as SynthesisJob[];
      return "";
    }
    if (last.includes("nohup")) {
      return "4242\n";
    }
    if (last.includes("kill -0")) {
      if (unreachable > 0) {
        unreachable -= 1;
        throw new Error("ssh exited with 255");
      }
      looks += 1;
      const ready = sentJobs
        .slice(0, looks)
        .map((job) =>
          JSON.stringify(
            job.id === options.failing
              ? { id: job.id, ok: false, error: "RuntimeError: boom" }
              : ok(job.id),
          ),
        );
      const running = looks < sentJobs.length ? ["BGS-RUNNING"] : [];
      return [...running, "model log line", ...ready].join("\n");
    }
    return "";
  };
  return { run, commands, sent: () => sentJobs };
}

const job = (id: string): SynthesisJob => ({
  id,
  lang: "wo",
  pieces: ["Texte de test."],
  out: join(dir, "audio", `${id}.mp3`),
});

const quick = { wait: () => Promise.resolve(), host: "voices@example.test", keyPath: "k" };

describe("remoteSynthesizer", () => {
  it("reads in the background on the server and hands each recording over once copied", async () => {
    const fake = server({ failing: "c" });
    const synthesize = remoteSynthesizer({ ...quick, run: fake.run });
    const handed: SynthesisResult[] = [];
    const results = await synthesize([job("a"), job("b"), job("c")], (result) => {
      handed.push(result);
      return Promise.resolve();
    });
    expect(handed.map((result) => result.id)).toEqual(["a", "b", "c"]);
    expect(results).toEqual([
      ok("a"),
      ok("b"),
      { id: "c", ok: false, error: "RuntimeError: boom" },
    ]);
    expect(fake.sent().map((sent) => sent.out)).toEqual([
      `${WORK}/0.mp3`,
      `${WORK}/1.mp3`,
      `${WORK}/2.mp3`,
    ]);
    expect(await readFile(join(dir, "audio", "a.mp3"), "utf8")).toBe("mp3");
    expect(fake.commands.some((command) => command.includes("nohup"))).toBe(true);
    expect(fake.commands.at(-1)).toBe(`rm -rf ${WORK}`);
  });

  it("waits while the server cannot be reached, then goes on where it was", async () => {
    const fake = server({ unreachable: 3 });
    const synthesize = remoteSynthesizer({ ...quick, run: fake.run });
    expect(await synthesize([job("a")])).toEqual([ok("a")]);
  });

  it("gives up a group when the server stays unreachable too long", async () => {
    const fake = server({ unreachable: 100 });
    let clock = 0;
    const synthesize = remoteSynthesizer({
      ...quick,
      run: fake.run,
      maxSilenceMs: 3000,
      now: () => (clock += 1000),
    });
    await expect(synthesize([job("a")])).rejects.toThrow("ssh exited with 255");
    expect(fake.commands.at(-1)).toBe(`rm -rf ${WORK}`);
  });

  it("reports a recording that could not be copied back, without leaving a half file", async () => {
    const fake = server({ copyFails: true });
    const synthesize = remoteSynthesizer({ ...quick, run: fake.run });
    const [result] = await synthesize([job("a")]);
    expect(result).toMatchObject({ id: "a", ok: false });
    await expect(stat(join(dir, "audio", "a.mp3"))).rejects.toThrow();
  });

  it("refuses paths that are not plain, and an unexpected working folder", async () => {
    expect(() => remoteSynthesizer({ ...quick, project: "/home/x; rm -rf /" })).toThrow(
      "plain absolute paths",
    );
    const synthesize = remoteSynthesizer({ ...quick, run: () => Promise.resolve("/etc\n") });
    await expect(synthesize([job("a")])).rejects.toThrow("unexpected working folder");
  });
});
