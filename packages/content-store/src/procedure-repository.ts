import {
  procedureSchema,
  type LocalizedSheet,
  type Procedure,
  type SheetLang,
} from "@bgs/shared-types";
import { VersionedJsonStore, type SaveOutcome } from "./versioned-json-store";

export interface ProcedureRepository {
  get(id: string): Promise<Procedure | null>;
  getBySlug(slug: string): Promise<Procedure | null>;
  /** Every procedure, in alphabetical order of its French title. */
  all(): Promise<Procedure[]>;
  save(procedure: Procedure): Promise<SaveOutcome>;
  /**
   * Attaches a machine translation of the sheet, replacing the previous one of that
   * language. Derived like a newspaper's images: no new version. False if unknown.
   */
  setLocalized(id: string, lang: SheetLang, sheet: LocalizedSheet): Promise<boolean>;
}

function titleOf(procedure: Procedure): string {
  return procedure.translations.find((t) => t.lang === "fr")?.title ?? "";
}

const byTitle = new Intl.Collator("fr", { sensitivity: "base" });

/** Alphabetical order of the French titles, shared by every procedure store. */
export function byFrenchTitle(a: Procedure, b: Procedure): number {
  return byTitle.compare(titleOf(a), titleOf(b));
}

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
      .sort(byFrenchTitle);
  }

  save(procedure: Procedure): Promise<SaveOutcome> {
    return this.store.save(procedure);
  }

  setLocalized(id: string, lang: SheetLang, sheet: LocalizedSheet): Promise<boolean> {
    return this.store.replaceCurrent(id, (current) => withSheet(current, lang, sheet));
  }
}

/** The procedure with its sheet in `lang` replaced, shared by every procedure store. */
export function withSheet(procedure: Procedure, lang: SheetLang, sheet: LocalizedSheet): Procedure {
  return { ...procedure, localized: { ...procedure.localized, [lang]: sheet } };
}
