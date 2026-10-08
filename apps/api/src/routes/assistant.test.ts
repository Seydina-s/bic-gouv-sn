import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProcedureRepository, RemoteConfigStore, fileDocument } from "@bgs/content-store";
import { assistantReplySchema, assistantUsageSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSettingStore } from "../admin/setting-store";
import { buildApp } from "../app";
import type { LlmProvider } from "../assistant/llm-provider";
import { loadConfig } from "../config";
import { ErrorJournal } from "../journal/error-journal";
import type { ErrorJournalStore } from "../journal/error-journal-store";
import { adminForTests } from "../testing/admin-session";
import { procedure } from "../testing/procedure-fixture";
import { temporaryStore } from "../testing/store";

let dir: string;
let admin: Awaited<ReturnType<typeof adminForTests>>;
const apps: FastifyInstance[] = [];

// Placeholder texts, not real content.
const ANSWER = '{"status":"answered","answer":"Le passeport fictif coûte peu.","citations":[1]}';

function model(text = ANSWER): LlmProvider & { calls: number } {
  const llm = {
    name: "test",
    calls: 0,
    complete: () => {
      llm.calls += 1;
      return Promise.resolve({ text, model: "test", inputTokens: 800, outputTokens: 40 });
    },
  };
  return llm;
}

function emptyJournalStore(): ErrorJournalStore {
  return {
    add: () => Promise.resolve(),
    all: () => Promise.resolve([]),
    resolve: () => Promise.resolve(false),
  };
}

async function start(
  options: { llm?: LlmProvider | null; features?: object; errorJournal?: ErrorJournal } = {},
) {
  const procedures = new FileProcedureRepository(join(dir, "procedures.json"));
  await procedures.save(
    procedure(1, "Passeport fictif", "<p>Le passeport fictif se demande au guichet de test.</p>"),
  );
  const remotePath = join(dir, "remote-config.json");
  await writeFile(
    remotePath,
    JSON.stringify({ minVersion: null, features: options.features ?? {} }),
  );
  const app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    procedures,
    admin: admin.admin,
    remoteConfig: new RemoteConfigStore(fileDocument(remotePath)),
    settings: new FileSettingStore(join(dir, "settings.json")),
    llm: options.llm === undefined ? model() : options.llm,
    errorJournal: options.errorJournal ?? null,
  });
  apps.push(app);
  return app;
}

const ask = (app: FastifyInstance, question = "Comment demander le passeport fictif ?") =>
  app.inject({
    method: "POST",
    url: "/v1/assistant/answers",
    payload: { question, lang: "fr", mode: "ask" },
  });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-assistant-"));
  admin = await adminForTests();
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  await rm(dir, { recursive: true, force: true });
});

describe("POST /v1/assistant/answers", () => {
  it("answers from the official base, with the procedure to open", async () => {
    const response = await ask(await start());
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const reply = assistantReplySchema.parse(response.json());
    expect(reply.status).toBe("answered");
    expect(reply.sources).toEqual([
      expect.objectContaining({ kind: "procedure", slug: "test-1", title: "Passeport fictif" }),
    ]);
  });

  it("says the assistant is not available yet while no key is set", async () => {
    const reply = assistantReplySchema.parse((await ask(await start({ llm: null }))).json());
    expect(reply.status).toBe("unavailable");
  });

  it("refuses a question too short or too long", async () => {
    const app = await start();
    expect((await ask(app, "ok")).statusCode).toBe(400);
    expect((await ask(app, "x".repeat(301))).statusCode).toBe(400);
  });

  it("is refused while switched off in the console", async () => {
    const llm = model();
    const response = await ask(await start({ llm, features: { assistant: false } }));
    expect(response.statusCode).toBe(503);
    expect(response.json<{ code: string }>().code).toBe("ASSISTANT_OFF");
    expect(llm.calls).toBe(0);
  });

  it("journals a pause past the monthly limit, set by an admin in the console", async () => {
    const errorJournal = new ErrorJournal(emptyJournalStore());
    const llm = model();
    const app = await start({ llm, errorJournal });
    const headers = { authorization: `Bearer ${await admin.tokenFor("admin")}` };

    const changed = await app.inject({
      method: "PUT",
      url: "/admin/v1/assistant/limit",
      headers,
      payload: { monthlyLimit: 1 },
    });
    expect(changed.statusCode).toBe(200);
    await ask(app);
    const paused = assistantReplySchema.parse((await ask(app)).json());
    expect(paused.status).toBe("paused");
    expect(paused.resumesOn).toMatch(/^\d{4}-\d{2}-01$/);
    expect(llm.calls).toBe(1);
    expect((await errorJournal.entries())[0]).toMatchObject({
      code: "ASSISTANT_LIMIT_REACHED",
      where: "POST /v1/assistant/answers",
    });

    const usage = await app.inject({ method: "GET", url: "/admin/v1/assistant", headers });
    expect(assistantUsageSchema.parse(usage.json())).toMatchObject({
      questions: 1,
      monthlyLimit: 1,
      inputTokens: 800,
      outputTokens: 40,
      configured: true,
    });
    const audit = await admin.admin.journal.entries();
    expect(audit.some((line) => line.action === "assistant.limit-changed")).toBe(true);
  });

  it("lets only admins change the limit", async () => {
    const app = await start();
    const as = async (role: "editor" | "reviewer") =>
      app.inject({
        method: "PUT",
        url: "/admin/v1/assistant/limit",
        headers: { authorization: `Bearer ${await admin.tokenFor(role)}` },
        payload: { monthlyLimit: 5 },
      });
    expect((await as("editor")).statusCode).toBe(403);
    expect((await as("reviewer")).statusCode).toBe(403);
  });
});
