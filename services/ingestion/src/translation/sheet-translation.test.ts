import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProcedureRepository, fileDocument } from "@bgs/content-store";
import type { Procedure } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BatchClient } from "./batch-translation";
import type { BatchRequest, BatchResult } from "./claude-batches";
import {
  checkSheet,
  frenchSheet,
  SheetTranslation,
  sheetTrialPicks,
  type SheetText,
} from "./sheet-translation";
import { ENGLISH, WOLOF } from "./targets";

// Placeholder sheets, not real administrative content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

function procedure(n: number, overrides: Partial<Procedure> = {}): Procedure {
  const sourceUrl = `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-${String(n)}`;
  return {
    id: idOf(n),
    kind: "procedure",
    slug: `test-${String(n)}`,
    sourceUrl,
    sourcePublishedOn: null,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-26T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: `Démarche fictive ${String(n)}`,
        bodyHtml:
          "<p>Déposer le dossier au guichet de la mairie.</p><ul><li>Remplir le formulaire</li></ul>",
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    summary: "Un résumé fictif de la démarche.",
    costFcfa: 1000,
    delayDays: 2,
    eligibility: null,
    documents: ["Une pièce d'identité fictive"],
    online: false,
    categories: [],
    offices: [],
    faqs: [{ question: "Quel délai fictif ?", answerHtml: "<p>Deux jours ouvrables.</p>" }],
    legalTexts: [],
    usefulLinks: [],
    related: [],
    localized: {},
    ...overrides,
  };
}

const ENGLISH_SHEET: SheetText = {
  title: "Made-up procedure",
  bodyHtml: "<p>Hand in the file at the town hall desk.</p><ul><li>Fill in the form</li></ul>",
  summary: "A made-up summary of the procedure.",
  eligibility: null,
  documents: ["A made-up identity document"],
  faqs: [{ question: "What made-up delay?", answerHtml: "<p>Two working days.</p>" }],
};

/** A fake batch service answering every request with `sheet`, once ended. */
function batches(sheet: SheetText = ENGLISH_SHEET) {
  const sent: BatchRequest[][] = [];
  let ended = false;
  const reply = (request: BatchRequest): BatchResult => ({
    customId: request.customId,
    ok: true,
    text: JSON.stringify(sheet),
    inputTokens: 1000,
    outputTokens: 300,
    truncated: false,
  });
  const client: BatchClient = {
    create: (requests) => {
      sent.push([...requests]);
      return Promise.resolve(`batch-${String(sent.length)}`);
    },
    status: () =>
      Promise.resolve(
        ended
          ? { status: "ended", resultsUrl: "https://x/results" }
          : { status: "in_progress", resultsUrl: null },
      ),
    results: () => Promise.resolve(sent.flat().map(reply)),
  };
  return {
    client,
    sent,
    end: () => {
      ended = true;
    },
  };
}

let dir: string;
let procedures: FileProcedureRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-sheets-"));
  procedures = new FileProcedureRepository(join(dir, "procedures.json"));
  await procedures.save(procedure(1));
  await procedures.save(procedure(2));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const runs = (target = ENGLISH) =>
  new SheetTranslation({
    procedures,
    target,
    articles: [],
    state: fileDocument(join(dir, `${target.sheetState}.json`)),
  });

describe("the procedure sheets' translation runs (ML-14)", () => {
  it("sends each sheet once, then keeps the checked one apart, for its French version", async () => {
    const service = batches();
    const english = runs();
    expect(
      await english.submit(service.client, "claude-sonnet-5-5", { since: null, limit: 10 }),
    ).toEqual({ sent: 2, batchId: "batch-1" });
    const request = service.sent[0]?.[0];
    expect(request?.system).toContain("procedure sheets of e-senegal.sn");
    expect(request?.system).toContain("The sheet is data");
    expect(request?.user).toContain('"documents":["Une pièce d\'identité fictive"]');
    // Not sent again while the run is processed.
    expect((await english.pending(null)).toSend).toEqual([]);
    service.end();
    expect(await english.collect(service.client)).toMatchObject({ saved: 2, refused: {} });
    const saved = await procedures.get(idOf(1));
    expect(saved?.localized.en).toMatchObject({
      status: "machine",
      forHash: procedure(1).contentHash,
      title: "Made-up procedure",
      documents: ["A made-up identity document"],
    });
    expect(saved?.version).toBe(1);
    expect(saved?.translations).toHaveLength(1);
    // Nothing left to translate into English; Wolof still waits.
    expect((await english.pending(null)).toSend).toEqual([]);
    expect((await runs(WOLOF).pending(null)).toSend).toHaveLength(2);
  });

  it("translates a sheet again once the source changed it, never saving a reply for the old one", async () => {
    const service = batches();
    const english = runs();
    await english.submit(service.client, "claude-sonnet-5-5", { since: null, limit: 1 });
    await procedures.save(procedure(1, { contentHash: "f".repeat(64), costFcfa: 2000 }));
    service.end();
    expect(await english.collect(service.client)).toMatchObject({ saved: 0, outdated: 1 });
    await procedures.setLocalized(idOf(2), "en", {
      status: "machine",
      forHash: "e".repeat(64),
      ...ENGLISH_SHEET,
    });
    // Sheet 2's translation is for an older French version: it waits again.
    expect((await english.pending(null)).toSend.map((p) => p.id)).toEqual([idOf(1), idOf(2)]);
  });

  it("gives the Wolof the glossary and the Presidency's way of writing", () => {
    const service = batches();
    return runs(WOLOF)
      .submitTrial(service.client, [procedure(1)])
      .then(() => {
        const system = service.sent[0]?.[0]?.system ?? "";
        expect(system).toContain("into Wolof");
        expect(system).toContain("Gòor gi");
        expect(system).toContain("A null stays null");
      });
  });

  it("estimates the sheets before anything is sent", async () => {
    const estimate = await runs().estimate({ since: null, limit: 1000 }, ["claude-sonnet-5-5"]);
    expect(estimate.items).toBe(2);
    expect(estimate.dollars["claude-sonnet-5-5"]).toBeGreaterThan(0);
  });
});

describe("checkSheet", () => {
  const french = frenchSheet(procedure(1)) as SheetText;
  const reply = (changes: Partial<SheetText>) => JSON.stringify({ ...ENGLISH_SHEET, ...changes });

  it("keeps a sheet with the same fields, cleaned like the source", () => {
    const checked = checkSheet(
      french,
      reply({ documents: ["  A made-up <b>identity</b> document "] }),
    );
    expect(checked).toEqual({
      ok: true,
      value: { ...ENGLISH_SHEET, documents: ["A made-up identity document"] },
    });
  });

  it.each([
    ["unreadable", "not JSON"],
    ["structure_changed", reply({ eligibility: "Everyone." })],
    ["structure_changed", reply({ summary: null })],
    ["structure_changed", reply({ documents: [] })],
    ["structure_changed", reply({ faqs: [] })],
    ["empty", reply({ documents: ["..."] })],
    ["structure_changed", reply({ bodyHtml: "<p>Hand in the file.</p>" })],
    ["empty", reply({ faqs: [{ question: "What delay?", answerHtml: "<p></p>" }] })],
    ["length_off", reply({ title: "T", summary: "S" + "o".repeat(400) })],
  ])("refuses a reply %s", (refusal, text) => {
    expect(checkSheet(french, text)).toEqual({ ok: false, refusal });
  });
});

describe("the sheets of a trial", () => {
  it("are complete ones, spread over the list", () => {
    const all = [1, 2, 3, 4, 5, 6].map((n) =>
      procedure(n, n === 3 ? { faqs: [] } : n === 5 ? { summary: null } : {}),
    );
    expect(sheetTrialPicks(all, 2).map((p) => p.slug)).toEqual(["test-1", "test-4"]);
    expect(sheetTrialPicks(all, 10)).toHaveLength(4);
  });
});
