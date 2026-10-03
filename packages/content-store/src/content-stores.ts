import type { Database } from "@bgs/database";
import type { ArticleRepository } from "./article-repository";
import { FileArticleRepository } from "./file-article-repository";
import { fileDocument, postgresDocument, type JsonDocument } from "./json-document";
import { PostgresArticleRepository } from "./postgres-article-repository";
import { PostgresProcedureRepository } from "./postgres-procedure-repository";
import { FileProcedureRepository, type ProcedureRepository } from "./procedure-repository";
import { ProcedureThemeStore } from "./procedure-theme-store";
import { RemoteConfigStore } from "./remote-config-store";
import { StateServiceStore } from "./state-service-store";

/** The files of each content when there is no database (development, a single server). */
export interface ContentPaths {
  news: string;
  procedures: string;
  procedureThemes: string;
  stateServices: string;
  remoteConfig: string;
  ingestionStatus: string;
}

/** Every content the collection writes and the API serves. */
export interface ContentStores {
  articles: ArticleRepository;
  procedures: ProcedureRepository;
  procedureThemes: ProcedureThemeStore;
  stateServices: StateServiceStore;
  remoteConfig: RemoteConfigStore;
  ingestionStatus: JsonDocument;
}

/** Names of the documents in `content_documents`, fixed once and for all. */
export const CONTENT_DOCUMENTS = {
  procedureThemes: "procedure-themes",
  stateServices: "state-services",
  remoteConfig: "remote-config",
  ingestionStatus: "ingestion-status",
} as const;

/**
 * The content stores (SCALE-02): in PostgreSQL when there is a database, shared by
 * every API instance and the collection; otherwise in the files of `paths`.
 */
export function contentStores(database: Database | null, paths: ContentPaths): ContentStores {
  const document = (name: keyof typeof CONTENT_DOCUMENTS): JsonDocument =>
    database === null
      ? fileDocument(paths[name])
      : postgresDocument(database, CONTENT_DOCUMENTS[name]);
  return {
    articles:
      database === null
        ? new FileArticleRepository(paths.news)
        : new PostgresArticleRepository(database),
    procedures:
      database === null
        ? new FileProcedureRepository(paths.procedures)
        : new PostgresProcedureRepository(database),
    procedureThemes: new ProcedureThemeStore(document("procedureThemes")),
    stateServices: new StateServiceStore(document("stateServices")),
    remoteConfig: new RemoteConfigStore(document("remoteConfig")),
    ingestionStatus: document("ingestionStatus"),
  };
}
