import type { Procedure } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PostgresProcedureRepository } from "./postgres-procedure-repository";
import { FileProcedureRepository, type ProcedureRepository } from "./procedure-repository";
import { storages, type OpenedStore } from "./testing/stores";

// Placeholder texts, not real content.
function procedure(n: number, title: string, overrides: Partial<Procedure> = {}): Procedure {
  const sourceUrl = `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-${String(n)}`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
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
      { lang: "fr", status: "official", title, bodyHtml: "<p>Étapes.</p>", sourceUrl },
    ],
    audio: [],
    embedding: null,
    summary: null,
    costFcfa: null,
    delayDays: null,
    eligibility: null,
    documents: [],
    online: false,
    categories: [],
    offices: [],
    faqs: [],
    legalTexts: [],
    usefulLinks: [],
    related: [],
    ...overrides,
  };
}

const STORAGES = storages<ProcedureRepository>(
  (path) => new FileProcedureRepository(path),
  (database) => new PostgresProcedureRepository(database),
);

describe.each(STORAGES)("procedures stored %s", (_name, open) => {
  let opened: OpenedStore<ProcedureRepository>;
  let repo: ProcedureRepository;
  beforeEach(async () => {
    opened = await open();
    repo = opened.store;
  });
  afterEach(async () => {
    await opened.close();
  });

  it("lists procedures alphabetically, accents ignored, and finds one by slug", async () => {
    await repo.save(procedure(1, "Passeport"));
    await repo.save(procedure(2, "Écrire au maire"));
    await repo.save(procedure(3, "Casier judiciaire"));
    expect((await repo.all()).map((p) => p.translations[0]?.title)).toEqual([
      "Casier judiciaire",
      "Écrire au maire",
      "Passeport",
    ]);
    expect((await repo.getBySlug("test-3"))?.id).toBe(procedure(3, "x").id);
    expect(await repo.getBySlug("absent")).toBeNull();
  });

  it("versions a procedure changed at the source, never overwriting silently", async () => {
    expect(await repo.save(procedure(1, "Passeport"))).toBe("created");
    expect(await repo.save(procedure(1, "Passeport"))).toBe("unchanged");
    const changed = procedure(1, "Passeport", { contentHash: "f".repeat(64), costFcfa: 20_000 });
    expect(await repo.save(changed)).toBe("updated");
    expect((await repo.get(changed.id))?.version).toBe(2);
    expect(await repo.get("absent")).toBeNull();
  });
});
