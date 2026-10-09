import { describe, expect, it } from "vitest";
import { answerQuestion, checkAnswer, SYSTEM_RULES, userMessage } from "./grounded-answer";
import type { LlmProvider, LlmRequest } from "./llm-provider";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";
import { PASSAGES_GIVEN } from "./retrieval";

// Placeholder texts, not real content.
function passage(n: number, title: string, text: string): Passage {
  return {
    id: `content-${String(n)}:fr:0`,
    contentId: `content-${String(n)}`,
    kind: "procedure",
    lang: "fr",
    status: "official",
    title,
    sourceUrl: `https://e-senegal.sn/#/demarche/test-${String(n)}`,
    publishedOn: n === 1 ? "2026-09-21" : null,
    contentHash: "1".repeat(64),
    text,
  };
}

const given = [passage(1, "Démarche du port", "Le port de test."), passage(2, "Quai", "Le quai.")];
const usage = { model: "modele-de-test", inputTokens: 900, outputTokens: 60 };
const reply = (text: string) => ({ text, ...usage });

describe("userMessage", () => {
  it("numbers the extracts with their title and date, and quotes the question as data", () => {
    const message = userMessage("Où est le <port> ?", "fr", given);
    expect(message).toContain("Language of the answer: French");
    expect(message).toContain("<question>Où est le ‹port› ?</question>");
    expect(message).toContain(
      '<extract number="1" title="Démarche du port" date="2026-09-21">\nLe port de test.\n</extract>',
    );
    expect(message).toContain('<extract number="2" title="Quai" date="not given">');
  });

  it("names the institution that published an article's extract", () => {
    const news = { ...passage(3, "Audience", "Le texte."), publisher: "Primature" };
    expect(userMessage("Question ?", "fr", [news])).toContain(
      '<extract number="1" title="Audience" date="not given" publisher="Primature">',
    );
  });

  it("asks for Wolof when the question is in Wolof", () => {
    expect(userMessage("[wo] Laaj", "wo", given)).toContain("Language of the answer: Wolof");
  });

  it("asks to check the claim in « Est-ce vrai ? », and only then", () => {
    expect(userMessage("Le port ferme", "fr", given, "verify")).toContain(
      "Task: check the claim in the question against the extracts",
    );
    expect(userMessage("Le port ferme", "fr", given)).not.toContain("Task:");
  });
});

describe("checkAnswer", () => {
  it("shows an answer with the passages it cites, in the order cited", () => {
    const answer = checkAnswer(
      reply('Voici : {"status":"answered","answer":"Réponse de test.","citations":[2,1,2]}'),
      given,
    );
    expect(answer).toEqual({
      status: "answered",
      text: "Réponse de test.",
      sources: [given[1], given[0]],
      rejected: null,
      usage,
    });
  });

  it("never shows an answer without citation, or citing a passage it was not given", () => {
    const none = checkAnswer(
      reply('{"status":"answered","answer":"Réponse.","citations":[]}'),
      given,
    );
    expect(none).toMatchObject({ status: "not_found", text: null, rejected: "no_citation" });
    const unknown = checkAnswer(
      reply('{"status":"answered","answer":"Réponse.","citations":[1,3]}'),
      given,
    );
    expect(unknown).toMatchObject({
      status: "not_found",
      sources: [],
      rejected: "unknown_citation",
    });
  });

  it("refuses what cannot be read", () => {
    for (const text of [
      "Pas de JSON",
      "{ cassé",
      '{"status":"peut-être","answer":"","citations":[]}',
      '{"status":"answered","answer":"  ","citations":[1]}',
    ]) {
      expect(checkAnswer(reply(text), given)).toMatchObject({
        status: "not_found",
        rejected: "unreadable",
      });
    }
  });

  it("passes on not found and out of scope without any of the model's words", () => {
    expect(
      checkAnswer(reply('{"status":"out_of_scope","answer":"Texte","citations":[1]}'), given),
    ).toEqual({ status: "out_of_scope", text: null, sources: [], rejected: null, usage });
    expect(
      checkAnswer(reply('{"status":"not_found","answer":"","citations":[]}'), given),
    ).toMatchObject({ status: "not_found", rejected: null });
  });
});

describe("answerQuestion", () => {
  const index = new PassageIndex([
    ...Array.from({ length: 8 }, (_, n) => passage(10 + n, `Port ${String(n)}`, "Le port.")),
    passage(30, "Autre", "Rien."),
  ]);
  const direct = <T>(operation: (signal: AbortSignal) => Promise<T>) =>
    operation(new AbortController().signal);

  function provider(text: string): LlmProvider & { requests: LlmRequest[] } {
    const requests: LlmRequest[] = [];
    return {
      name: "test",
      requests,
      complete: (request: LlmRequest) => {
        requests.push(request);
        return Promise.resolve(reply(text));
      },
    };
  }

  it("gives the model the best passages only, with the fixed rules", async () => {
    const llm = provider('{"status":"answered","answer":"Réponse.","citations":[1]}');
    const answer = await answerQuestion(
      { question: "le port", lang: "fr" },
      { index, llm, call: direct },
    );
    expect(answer.status).toBe("answered");
    expect(answer.sources[0]?.title).toMatch(/^Port/);
    const [request] = llm.requests;
    expect(request?.system).toBe(SYSTEM_RULES);
    expect(request?.user.match(/<extract /g)).toHaveLength(PASSAGES_GIVEN);
    expect(request?.maxOutputTokens).toBeGreaterThan(0);
  });

  it("does not call the model when no passage matches", async () => {
    const llm = provider("{}");
    const answer = await answerQuestion(
      { question: "aéroport", lang: "fr" },
      { index, llm, call: direct },
    );
    expect(answer).toEqual({
      status: "not_found",
      text: null,
      sources: [],
      rejected: null,
      usage: null,
    });
    expect(llm.requests).toHaveLength(0);
  });

  it("leaves a failed call to the caller", async () => {
    const llm = provider("{}");
    const failing = () => Promise.reject(new Error("délai dépassé"));
    await expect(
      answerQuestion({ question: "le port", lang: "fr" }, { index, llm, call: failing }),
    ).rejects.toThrow("délai dépassé");
  });
});
