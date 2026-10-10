import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SynthesisJob } from "./recordings";
import { remoteSynthesizer, type Run } from "./remote-synthesizer";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-remote-voices-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const WORK = "/tmp/bgs-voices-Ab12Cd34";

/** A voice server that reads every job aloud, except those whose id says "fails". */
function server(options: { copyFails?: boolean } = {}) {
  const commands: string[] = [];
  let sentJobs: SynthesisJob[] = [];
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
    if (last.includes("synthesize.py")) {
      return [
        "model log line",
        ...sentJobs.map((job) =>
          JSON.stringify(
            job.id.includes("fails")
              ? { id: job.id, ok: false, error: "RuntimeError: boom" }
              : { id: job.id, ok: true, durationMs: 1000, bytes: 3, voiceId: "adia-tts" },
          ),
        ),
      ].join("\n");
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

describe("remoteSynthesizer", () => {
  it("reads the texts on the server, brings the files back, and cleans the server", async () => {
    const fake = server();
    const synthesize = remoteSynthesizer({
      host: "voices@example.test",
      keyPath: "k",
      run: fake.run,
    });
    const results = await synthesize([job("a"), job("fails")]);
    expect(results).toEqual([
      { id: "a", ok: true, durationMs: 1000, bytes: 3, voiceId: "adia-tts" },
      { id: "fails", ok: false, error: "RuntimeError: boom" },
    ]);
    expect(fake.sent().map((sent) => sent.out)).toEqual([`${WORK}/0.mp3`, `${WORK}/1.mp3`]);
    expect(await readFile(join(dir, "audio", "a.mp3"), "utf8")).toBe("mp3");
    expect(fake.commands.at(-1)).toBe(`rm -rf ${WORK}`);
  });

  it("reports a file that could not be copied back, without leaving a half file", async () => {
    const fake = server({ copyFails: true });
    const synthesize = remoteSynthesizer({
      host: "voices@example.test",
      keyPath: "k",
      run: fake.run,
    });
    const [result] = await synthesize([job("a")]);
    expect(result).toMatchObject({ id: "a", ok: false });
    await expect(stat(join(dir, "audio", "a.mp3"))).rejects.toThrow();
    expect(fake.commands.at(-1)).toBe(`rm -rf ${WORK}`);
  });

  it("refuses paths that are not plain, and an unexpected working folder", async () => {
    expect(() =>
      remoteSynthesizer({ host: "h", keyPath: "k", project: "/home/x; rm -rf /" }),
    ).toThrow("plain absolute paths");
    const synthesize = remoteSynthesizer({
      host: "h",
      keyPath: "k",
      run: () => Promise.resolve("/etc\n"),
    });
    await expect(synthesize([job("a")])).rejects.toThrow("unexpected working folder");
  });
});
