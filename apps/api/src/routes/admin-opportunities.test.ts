import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  opportunitiesResponseSchema,
  opportunitySchema,
  type OpportunityDraft,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { FileOpportunityStore } from "../opportunities/opportunities";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder content, never a real opportunity.
const draft: OpportunityDraft = {
  kind: "formation",
  title: "Formation fictive pour les tests",
  organization: "Organisme fictif",
  summary: "Résumé fictif, recopié de la page officielle d'un portail.",
  deadline: "2099-12-31",
  officialUrl: "https://3fpt.sn/appel-a-candidature/",
};

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-opportunities-"));
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
    opportunityStore: new FileOpportunityStore(join(dir, "opportunities.json")),
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function post(token: string, url: string, payload?: object) {
  return app.inject({
    method: "POST",
    url: `/admin/v1/opportunities${url}`,
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload }),
  });
}

async function publicList() {
  const response = await app.inject({ method: "GET", url: "/v1/opportunities" });
  expect(response.statusCode).toBe(200);
  return opportunitiesResponseSchema.parse(response.json()).opportunities;
}

describe("opportunities", () => {
  it("reach the app only once a second person has published them", async () => {
    const preparer = await admin.tokenFor("editor");
    const prepared = await post(preparer, "", draft);
    expect(prepared.statusCode).toBe(201);
    const { id } = opportunitySchema.parse(prepared.json());
    expect(await publicList()).toEqual([]);

    const same = await post(preparer, `/${id}/publish`);
    expect(same.statusCode).toBe(403);
    expect(same.json<{ code: string }>().code).toBe("OPPORTUNITY_SAME_PERSON");

    expect((await post(await admin.tokenFor("editor"), `/${id}/publish`)).statusCode).toBe(200);
    const shown = await publicList();
    expect(shown).toMatchObject([{ id, title: draft.title, officialUrl: draft.officialUrl }]);
    // Nothing about the team leaves the console.
    expect(Object.keys(shown[0] ?? {})).not.toContain("preparedBy");

    const audit = await admin.admin.journal.entries();
    expect(audit.map((line) => line.action)).toEqual(
      expect.arrayContaining(["opportunity.prepared", "opportunity.published"]),
    );
  });

  it("leave the app once withdrawn or closed", async () => {
    const editor = await admin.tokenFor("editor");
    const other = await admin.tokenFor("editor");
    const publish = async (deadline: string | null) => {
      const { id } = opportunitySchema.parse(
        (await post(editor, "", { ...draft, deadline })).json(),
      );
      await post(other, `/${id}/publish`);
      return id;
    };
    const closed = await publish("2000-01-01");
    const open = await publish(null);
    const withdrawn = await publish("2099-01-01");
    expect((await post(other, `/${withdrawn}/withdraw`)).statusCode).toBe(200);
    expect((await post(other, `/${withdrawn}/withdraw`)).statusCode).toBe(409);
    const ids = (await publicList()).map((item) => item.id);
    expect(ids).toEqual([open]);
    expect(ids).not.toContain(closed);
  });

  it("are prepared by editors only, and always with an official link", async () => {
    expect((await post(await admin.tokenFor("reviewer"), "", draft)).statusCode).toBe(403);
    const editor = await admin.tokenFor("editor");
    const unofficial = await post(editor, "", {
      ...draft,
      officialUrl: "https://agregateur-prive.example/offre",
    });
    expect(unofficial.statusCode).toBe(400);
    const unknown = await post(editor, "/00000000-0000-4000-8000-000000000000/publish");
    expect(unknown.statusCode).toBe(404);
  });
});
