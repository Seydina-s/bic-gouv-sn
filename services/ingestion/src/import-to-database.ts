import {
  CONTENT_DOCUMENTS,
  fileDocument,
  PostgresArticleRepository,
  PostgresProcedureRepository,
  postgresDocument,
  VersionedJsonStore,
  type ContentPaths,
} from "@bgs/content-store";
import type { Database } from "@bgs/database";
import { newsArticleSchema, procedureSchema } from "@bgs/shared-types";

/** What the copy did for one kind of content. */
export interface CopyCount {
  imported: number;
  /** Already in the database: left untouched. */
  present: number;
}

export interface ImportReport {
  articles: CopyCount;
  procedures: CopyCount;
  /** Per document: copied, already in the database, or no file to copy. */
  documents: Record<keyof typeof CONTENT_DOCUMENTS, "imported" | "present" | "absent">;
}

async function copyEntries<T>(
  entries: Readonly<Record<string, { current: T; history: T[] }>>,
  importEntry: (entry: { current: T; history: T[] }) => Promise<"imported" | "present">,
): Promise<CopyCount> {
  const count: CopyCount = { imported: 0, present: 0 };
  for (const entry of Object.values(entries)) {
    count[await importEntry(entry)] += 1;
  }
  return count;
}

/**
 * Copies the contents of the .data/ files into PostgreSQL (SCALE-02), once, before
 * switching the API and the collection to the database: every article and procedure
 * with its version numbers and its whole history, and the documents (themes, state
 * services, remote control, collection report). Nothing already in the database is
 * changed, so it can be run again safely; the files are only read.
 */
export async function importToDatabase(
  database: Database,
  paths: ContentPaths,
): Promise<ImportReport> {
  const articles = new PostgresArticleRepository(database);
  const procedures = new PostgresProcedureRepository(database);
  const report: ImportReport = {
    articles: await copyEntries(
      await new VersionedJsonStore(paths.news, newsArticleSchema, "articles").entries(),
      (entry) => articles.importEntry(entry),
    ),
    procedures: await copyEntries(
      await new VersionedJsonStore(paths.procedures, procedureSchema, "procedures").entries(),
      (entry) => procedures.importEntry(entry),
    ),
    documents: {
      procedureThemes: "absent",
      stateServices: "absent",
      remoteConfig: "absent",
      ingestionStatus: "absent",
    },
  };
  for (const name of Object.keys(CONTENT_DOCUMENTS) as (keyof typeof CONTENT_DOCUMENTS)[]) {
    const saved = await fileDocument(paths[name]).read();
    if (saved === undefined) {
      continue;
    }
    report.documents[name] = await postgresDocument(database, CONTENT_DOCUMENTS[name]).update(
      (inDatabase) =>
        inDatabase === undefined
          ? { next: saved, result: "imported" as const }
          : { result: "present" as const },
    );
  }
  return report;
}
