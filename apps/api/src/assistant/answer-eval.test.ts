import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { answerSetSchema, judge, summarizeVerdicts, type AnswerCase } from "./answer-eval";
import type { GroundedAnswer } from "./grounded-answer";
import type { Passage } from "./passages";

// Placeholder texts, not real content.
const page = "https://e-senegal.sn/#/demarche/test-1";
const source: Passage = {
  id: "content-1:fr:0",
  contentId: "content-1",
  kind: "procedure",
  lang: "fr",
  status: "official",
  title: "Démarche de test",
  sourceUrl: page,
  publishedOn: null,
  contentHash: "1".repeat(64),
  text: "Texte de test.",
};

function answer(status: GroundedAnswer["status"], sources: Passage[] = []): GroundedAnswer {
  return {
    status,
    text: status === "answered" ? "Réponse de test." : null,
    sources,
    rejected: null,
    usage: null,
  };
}

const toAnswer: AnswerCase = {
  question: "Question de test ?",
  accepted: ["answered"],
  sources: [page],
};
const absent: AnswerCase = { question: "Question absente ?", accepted: ["not_found"] };

describe("judge", () => {
  it("passes an answer citing the expected page", () => {
    expect(judge(toAnswer, answer("answered", [source]))).toMatchObject({
      passed: true,
      invented: false,
    });
  });

  it("fails an answer citing another page, or no answer when one was expected", () => {
    const elsewhere = { ...source, sourceUrl: "https://e-senegal.sn/#/demarche/autre" };
    expect(judge(toAnswer, answer("answered", [elsewhere])).passed).toBe(false);
    expect(judge(toAnswer, answer("not_found"))).toMatchObject({ passed: false, invented: false });
  });

  it("counts an answer to a question the base cannot answer as an invention", () => {
    expect(judge(absent, answer("answered", [source]))).toMatchObject({
      passed: false,
      invented: true,
    });
    expect(judge(absent, answer("not_found")).passed).toBe(true);
    expect(judge(absent, answer("out_of_scope")).passed).toBe(false);
  });
});

describe("summarizeVerdicts", () => {
  it("counts the cases passed and the inventions", () => {
    const verdicts = [
      judge(toAnswer, answer("answered", [source])),
      judge(absent, answer("answered", [source])),
      judge(absent, answer("not_found")),
    ];
    expect(summarizeVerdicts(verdicts)).toEqual({ cases: 3, passed: 2, invented: 1 });
  });
});

describe("the test set of the repository", () => {
  it("is valid, with pages only for questions to answer", async () => {
    const raw: unknown = JSON.parse(
      await readFile(new URL("../../data/assistant-answer-eval.json", import.meta.url), "utf8"),
    );
    const { cases } = answerSetSchema.parse(raw);
    expect(cases.length).toBeGreaterThanOrEqual(20);
    for (const testCase of cases) {
      expect(testCase.sources !== undefined).toBe(testCase.accepted.includes("answered"));
    }
    expect(
      cases.filter((testCase) => !testCase.accepted.includes("answered")).length,
    ).toBeGreaterThanOrEqual(12);
  });
});
