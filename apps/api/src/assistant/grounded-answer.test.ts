import { describe, expect, it } from "vitest";
import {
  answerQuestion,
  checkAnswer,
  SYSTEM_RULES,
  userMessage,
  type AnswerTrace,
} from "./grounded-answer";
import type { LlmProvider, LlmRequest } from "./llm-provider";
import { PassageIndex } from "./passage-search";
import { REPHRASE_RULES } from "./question-rephrase";
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
const usage = {
  model: "modele-de-test",
  inputTokens: 900,
  outputTokens: 60,
  costMicrodollars: 1200,
};
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

  it("gives the bounds of this week to a question about the week only", () => {
    // Bench of 25/10/2026: given to all, the week made "the last Council" a refusal.
    const today = "2026-10-25";
    const latest = userMessage("Qu'a décidé le dernier Conseil ?", "fr", given, "ask", today);
    expect(latest).toContain("Today's date: 2026-10-25 (Sunday).");
    expect(latest).not.toContain("This week");
    expect(
      userMessage("Qu'a fait le gouvernement cette semaine ?", "fr", given, "ask", today),
    ).toContain("This week: Monday 2026-10-19 to Sunday 2026-10-25.");
    expect(
      userMessage("Lan la Njiitu réew mi def ayu bés bii ?", "wo", given, "ask", today),
    ).toContain("This week:");
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

describe("the rules of the answers", () => {
  it("keep a person's own situation in scope when they ask about a procedure", () => {
    // Bench of 17/10/2026: an inheritance, a divorce, a product's design and a stock
    // account were refused as off-topic, though procedures answer them.
    expect(SYSTEM_RULES).toContain("A person telling their own situation");
    expect(SYSTEM_RULES).toContain("opinions, jokes, poems, recipes");
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
    // The rephrasing first, then the answer.
    expect(llm.requests.map((r) => r.system)).toEqual([REPHRASE_RULES, SYSTEM_RULES]);
    const request = llm.requests.at(-1);
    expect(request?.system).toBe(SYSTEM_RULES);
    expect(request?.user.match(/<extract /g)).toHaveLength(PASSAGES_GIVEN);
    expect(request?.maxOutputTokens).toBeGreaterThan(0);
  });

  it("rephrases every question, and says not found when nothing matches", async () => {
    const llm = provider("{}");
    const answer = await answerQuestion(
      { question: "aéroport", lang: "fr" },
      { index, llm, call: direct },
    );
    expect(answer).toMatchObject({ status: "not_found", text: null, sources: [], rejected: null });
    expect(llm.requests.map((request) => request.system)).toEqual([REPHRASE_RULES]);
    expect(answer.usage).not.toBeNull();
  });

  /** A model that rephrases first, then answers; `failFirst` makes the rephrasing fail. */
  function scripted(failFirst = false): LlmProvider & { requests: LlmRequest[] } {
    const requests: LlmRequest[] = [];
    return {
      name: "test",
      requests,
      complete: (request: LlmRequest) => {
        requests.push(request);
        if (request.system === REPHRASE_RULES) {
          return failFirst
            ? Promise.reject(new Error("panne"))
            : Promise.resolve(reply('{"query": "le port"}'));
        }
        return Promise.resolve(reply('{"status":"answered","answer":"Réponse.","citations":[1]}'));
      },
    };
  }

  it("finds the French pages for a question in Wolof written in any spelling", async () => {
    const llm = scripted();
    // Placeholder Wolof, as people type it: no word of it is in the French pages.
    const answer = await answerQuestion(
      { question: "khamna fii la port bi nek", lang: "wo" },
      { index, llm, call: direct },
    );
    expect(answer.status).toBe("answered");
    expect(answer.sources[0]?.title).toMatch(/^Port/);
    // The model that answers reads the question as written.
    expect(llm.requests[1]?.user).toContain("khamna fii la port bi nek");
    // Both calls are counted in the month's use.
    expect(answer.usage?.inputTokens).toBe(2 * usage.inputTokens);
  });

  it("hears the news of a period in the rephrasing of a Wolof question", async () => {
    const dated = new PassageIndex([
      {
        ...passage(40, "Article fictif du jour", "Une activité fictive."),
        kind: "news-article" as const,
        publishedOn: "2026-10-17",
      },
      {
        ...passage(41, "Article fictif ancien", "Une autre activité."),
        kind: "news-article" as const,
        publishedOn: "2026-09-01",
      },
    ]);
    const requests: LlmRequest[] = [];
    const llm: LlmProvider = {
      name: "test",
      complete: (request: LlmRequest) => {
        requests.push(request);
        return Promise.resolve(
          reply(
            request.system === REPHRASE_RULES
              ? '{"query": "actualités du jour"}'
              : '{"status":"answered","answer":"Réponse.","citations":[1]}',
          ),
        );
      },
    };
    const answer = await answerQuestion(
      { question: "Lan mooy xibaar yu am solo tey ?", lang: "wo", today: "2026-10-17" },
      { index: dated, llm, call: direct },
    );
    expect(answer.sources.map((source) => source.title)).toEqual(["Article fictif du jour"]);
  });

  it("still searches the question as written when the rephrasing fails", async () => {
    const llm = scripted(true);
    const answer = await answerQuestion(
      { question: "port bi", lang: "wo" },
      { index, llm, call: direct },
    );
    expect(answer.status).toBe("answered");
    expect(llm.requests).toHaveLength(2);
  });

  it("tells the bench what the model was given and wrote, before the checks", async () => {
    const written = '{"status":"not_found","answer":"","citations":[]}';
    const traces: AnswerTrace[] = [];
    const answer = await answerQuestion(
      { question: "le port", lang: "fr" },
      { index, llm: provider(written), call: direct, observe: (trace) => traces.push(trace) },
    );
    expect(answer.status).toBe("not_found");
    expect(traces).toHaveLength(1);
    expect(traces[0]?.searched).toContain("le port");
    expect(traces[0]?.given).toHaveLength(PASSAGES_GIVEN);
    expect(traces[0]?.reply).toBe(written);
    // Nothing found: nothing given, nothing written.
    const none: AnswerTrace[] = [];
    await answerQuestion(
      { question: "aéroport", lang: "fr" },
      { index, llm: provider("{}"), call: direct, observe: (trace) => none.push(trace) },
    );
    expect(none).toHaveLength(1);
    expect(none[0]).toMatchObject({ given: [], reply: null });
    expect(none[0]?.searched).toContain("aéroport");
  });

  it("leaves a failed call to the caller", async () => {
    const llm = provider("{}");
    const failing = () => Promise.reject(new Error("délai dépassé"));
    await expect(
      answerQuestion({ question: "le port", lang: "fr" }, { index, llm, call: failing }),
    ).rejects.toThrow("délai dépassé");
  });
});
