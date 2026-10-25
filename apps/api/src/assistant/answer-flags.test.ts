import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AssistantFlagSubmission } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AnswerFlags, FileAnswerFlagStore } from "./answer-flags";

// Placeholder texts, not real content.
const FLAG: AssistantFlagSubmission = {
  question: "Comment demander le passeport fictif ?",
  lang: "fr",
  mode: "ask",
  status: "answered",
  answer: "Le passeport fictif se demande au guichet de test.",
  sources: [
    {
      kind: "procedure",
      contentId: "procedure-1",
      slug: "test-1",
      title: "Passeport fictif",
      url: "https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-1",
      publishedOn: null,
    },
  ],
};

let dir: string;
let path: string;
let today: Date;
let flags: AnswerFlags;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-answer-flags-"));
  path = join(dir, "flags.json");
  today = new Date("2026-10-25T10:00:00Z");
  flags = new AnswerFlags(new FileAnswerFlagStore(path), () => today);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("answers flagged by people (AST-30e)", () => {
  it("keeps the question, the answer and its sources, newest first, nothing more", async () => {
    await flags.receive(FLAG);
    today = new Date("2026-10-26T10:00:00Z");
    await flags.receive({ ...FLAG, question: "Une autre question fictive ?" });
    const listed = await flags.list();
    expect(listed.map((flag) => flag.question)).toEqual([
      "Une autre question fictive ?",
      FLAG.question,
    ]);
    expect(Object.keys(listed[0] ?? {}).sort()).toEqual(
      ["answer", "id", "lang", "mode", "question", "receivedAt", "sources", "status"].sort(),
    );
  });

  it("erases a flag after 90 days, even when no new flag comes", async () => {
    await flags.receive(FLAG);
    today = new Date("2027-01-22T10:00:00Z");
    expect(await flags.list()).toHaveLength(1);
    today = new Date("2027-01-24T10:00:00Z");
    expect(await flags.list()).toEqual([]);
    // Erased from the file, not only hidden from the console.
    expect(await readFile(path, "utf8")).not.toContain(FLAG.question);
  });
});
