import { fileURLToPath } from "node:url";
import { contentStores, type ContentPaths, type ContentStores } from "@bgs/content-store";
import { openDatabase } from "@bgs/database";

const dataDir = new URL("../../../../.data/", import.meta.url);
const inData = (name: string): string => fileURLToPath(new URL(name, dataDir));

/** The content files in .data/, or where the environment puts them. */
export function contentPaths(env: NodeJS.ProcessEnv = process.env): ContentPaths {
  return {
    news: env["NEWS_STORE_PATH"] ?? inData("news.json"),
    procedures: env["PROCEDURES_STORE_PATH"] ?? inData("procedures.json"),
    procedureThemes: env["PROCEDURE_THEMES_PATH"] ?? inData("procedure-themes.json"),
    stateServices: env["STATE_SERVICES_PATH"] ?? inData("state-services.json"),
    remoteConfig: env["REMOTE_CONFIG_PATH"] ?? inData("remote-config.json"),
    ingestionStatus: env["INGESTION_STATUS_PATH"] ?? inData("ingestion-status.json"),
  };
}

export interface CollectionStores {
  stores: ContentStores;
  /** True when writing to PostgreSQL (the files of .data/ are then not used). */
  inDatabase: boolean;
  paths: ContentPaths;
  close: () => Promise<void>;
}

/**
 * Where the collection writes (SCALE-02): PostgreSQL when DATABASE_URL is set, the
 * same database the API reads; otherwise the files of .data/. Close it at the end.
 */
export async function openStores(env: NodeJS.ProcessEnv = process.env): Promise<CollectionStores> {
  const database = await openDatabase(env["DATABASE_URL"]);
  const paths = contentPaths(env);
  return {
    stores: contentStores(database, paths),
    inDatabase: database !== null,
    paths,
    close: () => database?.close() ?? Promise.resolve(),
  };
}
