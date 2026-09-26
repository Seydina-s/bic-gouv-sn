import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProcedureRepository } from "@bgs/content-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import { detailResponseSchema, type ProcedureDetail } from "./api-schemas";
import { createEsenegalProvider, ESENEGAL_API, type ProcedureSource } from "./esenegal-provider";
import { USER_AGENT } from "../presidence/presidence-provider";
import { importProcedures } from "./import-procedures";
import { canonicalProcedureUrl, meaningful, normalizeProcedure } from "./normalize";

// Real responses of the e-senegal.sn interface recorded on 26/09/2026.
async function fixture(name: string): Promise<ProcedureDetail> {
  const raw: unknown = JSON.parse(
    await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  );
  const detail = detailResponseSchema.parse(raw).data.fetchDemarcheBySlug;
  if (detail === null) {
    throw new Error(`empty fixture ${name}`);
  }
  return detail;
}
const FETCHED_AT = "2026-09-26T10:00:00.000Z";

describe("meaningful", () => {
  it.each([
    ["Q", null],
    ["XXX", null],
    ["...", null],
    ["  ", null],
    [null, null],
    ["<p>Tout&nbsp;citoyen</p>", "Tout citoyen"],
    ["Tout\u00a0citoyen\u00a0\u00a0majeur", "Tout citoyen majeur"],
  ])("reads %j as %j", (value, expected) => {
    expect(meaningful(value)).toBe(expected);
  });
});

describe("normalizeProcedure", () => {
  it("keeps the facts of a well-filled procedure, traceable to its public page", async () => {
    const procedure = normalizeProcedure(await fixture("detail-rich"), FETCHED_AT);
    expect(procedure).toMatchObject({
      kind: "procedure",
      sourceUrl: canonicalProcedureUrl("demande-de-non-appartenance-a-la-fonction-publique-1"),
      eligibility: "Tout citoyen sénégalais âgé de 18 ans, au moins.",
      documents: ["Une copie de la carte nationale d’identité."],
      costFcfa: null,
      delayDays: 1,
    });
    expect(procedure.legalTexts).toHaveLength(3);
    // At the source: the only FAQ answer is "XXX" and the only link is plain http.
    expect(procedure.faqs).toEqual([]);
    expect(procedure.usefulLinks).toEqual([]);
    expect(procedure.translations[0]?.bodyHtml).not.toMatch(/style=|class=|<script/);
  });

  it("never shows the placeholders the source sometimes leaves", async () => {
    const procedure = normalizeProcedure(await fixture("detail-placeholders"), FETCHED_AT);
    expect(procedure.eligibility).toBeNull();
    expect(procedure.documents).toEqual([]);
    expect(procedure.costFcfa).toBe(1000);
  });

  it("gives the same id and fingerprint on every run", async () => {
    const detail = await fixture("detail-rich");
    const first = normalizeProcedure(detail, FETCHED_AT);
    const again = normalizeProcedure(detail, "2026-09-27T10:00:00.000Z");
    expect(again.id).toBe(first.id);
    expect(again.contentHash).toBe(first.contentHash);
  });

  it("quarantines a procedure without content", async () => {
    const detail = { ...(await fixture("detail-rich")), corps: "<p>Q</p>", description: "" };
    expect(() => normalizeProcedure(detail, FETCHED_AT)).toThrow(QuarantineError);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("createEsenegalProvider", () => {
  it("lists a page politely, with the project User-Agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      jsonResponse({
        data: {
          fetchDemarches: {
            pagination: { currentPage: 2, pageCount: 8 },
            results: [{ id: "a1", slug: "extrait-de-naissance" }],
          },
        },
      }),
    );
    const provider = createEsenegalProvider({ fetchImpl, intervalMs: 0 });
    expect(await provider.listPage(2)).toEqual({ slugs: ["extrait-de-naissance"], pageCount: 8 });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(ESENEGAL_API);
    expect(init?.headers).toMatchObject({ "User-Agent": USER_AGENT });
    const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as {
      variables?: unknown;
    };
    expect(body.variables).toEqual({ q: { page: 2, limit: 100 } });
  });

  it("fetches and normalizes one procedure", async () => {
    const raw: unknown = JSON.parse(
      await readFile(new URL("./fixtures/detail-rich.json", import.meta.url), "utf8"),
    );
    const provider = createEsenegalProvider({
      fetchImpl: vi.fn<typeof fetch>(() => jsonResponse(raw)),
      intervalMs: 0,
      now: () => new Date(FETCHED_AT),
    });
    const procedure = await provider.fetchProcedure(
      "demande-de-non-appartenance-a-la-fonction-publique-1",
    );
    expect(procedure.fetchedAt).toBe(FETCHED_AT);
  });

  it("quarantines a procedure gone from the source, or a changed response shape", async () => {
    const gone = createEsenegalProvider({
      fetchImpl: vi.fn<typeof fetch>(() => jsonResponse({ data: { fetchDemarcheBySlug: null } })),
      intervalMs: 0,
    });
    await expect(gone.fetchProcedure("absent")).rejects.toThrow(/not found/);
    const changed = createEsenegalProvider({
      fetchImpl: vi.fn<typeof fetch>(() => jsonResponse({ data: { other: true } })),
      intervalMs: 0,
    });
    await expect(changed.listPage(1)).rejects.toThrow(QuarantineError);
  });

  it("does not retry a refused request (4xx)", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => jsonResponse({}, 403));
    const provider = createEsenegalProvider({ fetchImpl, intervalMs: 0 });
    await expect(provider.listPage(1)).rejects.toMatchObject({
      code: "INGESTION_SOURCE_UNREACHABLE",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("importProcedures", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-import-procedures-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("imports every page, isolates failures, and is idempotent", async () => {
    const rich = normalizeProcedure(await fixture("detail-rich"), FETCHED_AT);
    const source: ProcedureSource = {
      listPage: (page) =>
        Promise.resolve({ slugs: page === 1 ? ["rich", "broken"] : [], pageCount: 2 }),
      fetchProcedure: (slug) =>
        slug === "rich"
          ? Promise.resolve(rich)
          : Promise.reject(new QuarantineError(slug, "empty")),
    };
    const repository = new FileProcedureRepository(join(dir, "procedures.json"));
    const first = await importProcedures(source, repository);
    expect(first.outcomes).toEqual({ created: 1, updated: 0, unchanged: 0 });
    expect(first.failures).toEqual([
      expect.objectContaining({ ref: "broken", code: "INGESTION_QUARANTINED" }),
    ]);
    const again = await importProcedures(source, repository, { maxPages: 1 });
    expect(again.outcomes).toEqual({ created: 0, updated: 0, unchanged: 1 });
  });
});
