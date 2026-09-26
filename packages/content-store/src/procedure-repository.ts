import { procedureSchema, type Procedure } from "@bgs/shared-types";
import { VersionedJsonStore, type SaveOutcome } from "./versioned-json-store";

export interface ProcedureRepository {
  get(id: string): Promise<Procedure | null>;
  getBySlug(slug: string): Promise<Procedure | null>;
  /** Every procedure, in alphabetical order of its French title. */
  all(): Promise<Procedure[]>;
  save(procedure: Procedure): Promise<SaveOutcome>;
}

function titleOf(procedure: Procedure): string {
  return procedure.translations.find((t) => t.lang === "fr")?.title ?? "";
}

const byTitle = new Intl.Collator("fr", { sensitivity: "base" });

/** Provisional procedure store: one JSON file (see VersionedJsonStore). */
export class FileProcedureRepository implements ProcedureRepository {
  private readonly store: VersionedJsonStore<Procedure>;

  constructor(path: string) {
    this.store = new VersionedJsonStore(path, procedureSchema, "procedures");
  }

  get(id: string): Promise<Procedure | null> {
    return this.store.get(id);
  }

  async getBySlug(slug: string): Promise<Procedure | null> {
    return (await this.all()).find((procedure) => procedure.slug === slug) ?? null;
  }

  async all(): Promise<Procedure[]> {
    return Object.values(await this.store.entries())
      .map((entry) => entry.current)
      .sort((a, b) => byTitle.compare(titleOf(a), titleOf(b)));
  }

  save(procedure: Procedure): Promise<SaveOutcome> {
    return this.store.save(procedure);
  }
}
