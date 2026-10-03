import type { Database } from "@bgs/database";
import { procedureSchema, type Procedure } from "@bgs/shared-types";
import { byFrenchTitle, type ProcedureRepository } from "./procedure-repository";
import { PostgresVersionedTable } from "./postgres-versioned-table";
import type { SaveOutcome } from "./versioned-json-store";

/** Procedures in PostgreSQL (SCALE-02), behind the same interface as the file store. */
export class PostgresProcedureRepository implements ProcedureRepository {
  private readonly table: PostgresVersionedTable<Procedure>;

  constructor(private readonly database: Database) {
    this.table = new PostgresVersionedTable(database, {
      table: "procedures",
      historyTable: "procedure_history",
      schema: procedureSchema,
      columns: ["slug"],
      values: (procedure) => [procedure.slug],
    });
  }

  get(id: string): Promise<Procedure | null> {
    return this.table.get(id);
  }

  async getBySlug(slug: string): Promise<Procedure | null> {
    const { rows } = await this.database.query(
      "SELECT data FROM procedures WHERE slug = $1 ORDER BY id LIMIT 1",
      [slug],
    );
    return this.table.parse(rows)[0] ?? null;
  }

  /** A few hundred official sheets: sorted here, by the same French order as the files. */
  async all(): Promise<Procedure[]> {
    const { rows } = await this.database.query("SELECT data FROM procedures");
    return this.table.parse(rows).sort(byFrenchTitle);
  }

  save(procedure: Procedure): Promise<SaveOutcome> {
    return this.table.save(procedure);
  }
}
