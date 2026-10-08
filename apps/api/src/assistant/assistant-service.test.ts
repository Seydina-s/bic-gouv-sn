import { describe, expect, it } from "vitest";
import type { AuditInput } from "@bgs/admin-auth";
import type { AuditJournal } from "../admin/audit-journal";
import type { SettingStore } from "../admin/setting-store";
import { MemoryKeyValueStore } from "../shared-state/key-value-store";
import { AssistantService, DEFAULT_MONTHLY_LIMIT, monthOf } from "./assistant-service";
import type { Knowledge } from "./knowledge";
import type { LlmProvider, LlmRequest } from "./llm-provider";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";

// Placeholder texts, not real content.
function passage(n: number, kind: Passage["kind"], title: string, text: string): Passage {
  return {
    id: `content-${String(n)}:fr:0`,
    contentId: `content-${String(n)}`,
    kind,
    lang: "fr",
    status: "official",
    title,
    sourceUrl: `https://www.presidence.sn/fr/test-${String(n)}`,
    publishedOn: "2026-10-01",
    contentHash: "1".repeat(64),
    text,
  };
}

const PASSAGES = [
  passage(1, "procedure", "Démarche du port", "Le port de test ouvre le lundi."),
  passage(2, "news-article", "Nouvelles du port", "Le port de test accueille un navire."),
];

const knowledge: Knowledge = {
  index: new PassageIndex(PASSAGES),
  passages: PASSAGES,
  procedureSlugs: new Map([["content-1", "demarche-du-port"]]),
};

const ANSWER = '{"status":"answered","answer":"Le port ouvre le lundi.","citations":[1,2]}';

function model(text = ANSWER): LlmProvider & { requests: LlmRequest[] } {
  const requests: LlmRequest[] = [];
  return {
    name: "test",
    requests,
    complete: (request) => {
      requests.push(request);
      return Promise.resolve({ text, model: "test", inputTokens: 1000, outputTokens: 50 });
    },
  };
}

function memorySettings(): SettingStore {
  const values = new Map<string, unknown>();
  return {
    get: (key) => Promise.resolve(values.get(key)),
    set: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}

function service(llm: LlmProvider | null, now = Date.parse("2026-10-07T10:00:00Z")) {
  const appended: AuditInput[] = [];
  const journal = {
    append: (input: AuditInput) => {
      appended.push(input);
      return Promise.resolve({ ...input, previousHash: "", hash: "" });
    },
    entries: () => Promise.resolve([]),
  } satisfies AuditJournal;
  let time = now;
  const assistant = new AssistantService({
    llm,
    knowledge: { read: () => Promise.resolve(knowledge) },
    state: new MemoryKeyValueStore(() => time),
    settings: memorySettings(),
    journal,
    call: (operation) => operation(new AbortController().signal),
    now: () => time,
  });
  return {
    assistant,
    appended,
    setTime: (at: string) => {
      time = Date.parse(at);
    },
  };
}

const question = { question: "Quand ouvre le port ?", lang: "fr", mode: "ask" } as const;

describe("the assistant service", () => {
  it("answers with each official page once, and the procedure's slug to open it", async () => {
    const { assistant } = service(model());
    const { reply, problem } = await assistant.answer(question);
    expect(problem).toBeNull();
    expect(reply.status).toBe("answered");
    expect(reply.text).toBe("Le port ouvre le lundi.");
    expect(reply.sources.map(({ kind, slug }) => ({ kind, slug }))).toEqual(
      expect.arrayContaining([
        { kind: "procedure", slug: "demarche-du-port" },
        { kind: "news-article", slug: null },
      ]),
    );
    expect(await assistant.usage()).toEqual({
      month: "2026-10",
      questions: 1,
      monthlyLimit: DEFAULT_MONTHLY_LIMIT,
      inputTokens: 1000,
      outputTokens: 50,
      configured: true,
    });
  });

  it("says it is unavailable, without counting, while no model is configured", async () => {
    const { assistant } = service(null);
    const { reply } = await assistant.answer(question);
    expect(reply).toEqual({ status: "unavailable", text: null, sources: [], resumesOn: null });
    expect((await assistant.usage()).configured).toBe(false);
  });

  it("does not count a question the base has nothing for (no model call)", async () => {
    const llm = model();
    const { assistant } = service(llm);
    const { reply } = await assistant.answer({ ...question, question: "aéroport lointain" });
    expect(reply.status).toBe("not_found");
    expect(llm.requests).toHaveLength(0);
    expect((await assistant.usage()).questions).toBe(0);
  });

  it("pauses past the monthly limit until the first day of next month", async () => {
    const llm = model();
    const { assistant, appended, setTime } = service(llm);
    await assistant.setMonthlyLimit(2, "admin-1");
    expect(appended[0]).toMatchObject({
      actor: "admin-1",
      action: "assistant.limit-changed",
      details: { from: DEFAULT_MONTHLY_LIMIT, to: 2 },
    });
    await assistant.answer(question);
    await assistant.answer(question);
    const third = await assistant.answer(question);
    expect(third).toEqual({
      reply: { status: "paused", text: null, sources: [], resumesOn: "2026-11-01" },
      problem: "quota_reached",
    });
    expect(llm.requests).toHaveLength(2);
    expect((await assistant.usage()).questions).toBe(2);

    setTime("2026-11-01T00:00:01Z");
    expect((await assistant.answer(question)).reply.status).toBe("answered");
  });

  it("holds the limit when many ask at the same moment", async () => {
    const llm = model();
    const { assistant } = service(llm);
    await assistant.setMonthlyLimit(3, "admin-1");
    const replies = await Promise.all(Array.from({ length: 10 }, () => assistant.answer(question)));
    expect(replies.filter(({ reply }) => reply.status === "answered")).toHaveLength(3);
    expect(llm.requests).toHaveLength(3);
  });

  it("stays usable when the model fails, and says why for the error journal", async () => {
    const failing: LlmProvider = {
      name: "test",
      complete: () => Promise.reject(new Error("délai dépassé")),
    };
    const { assistant } = service(failing);
    expect(await assistant.answer(question)).toEqual({
      reply: { status: "unavailable", text: null, sources: [], resumesOn: null },
      problem: "model_failed",
      failure: new Error("délai dépassé"),
    });
  });

  it("shows nothing the model wrote without a valid citation", async () => {
    const { assistant } = service(model('{"status":"answered","answer":"Oui.","citations":[9]}'));
    expect(await assistant.answer(question)).toEqual({
      reply: { status: "not_found", text: null, sources: [], resumesOn: null },
      problem: "answer_rejected",
    });
  });

  it("names the month in Dakar time (UTC)", () => {
    expect(monthOf(Date.parse("2026-10-31T23:59:59Z"))).toBe("2026-10");
    expect(monthOf(Date.parse("2026-11-01T00:00:00Z"))).toBe("2026-11");
  });
});
