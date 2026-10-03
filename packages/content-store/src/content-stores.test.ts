import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "@bgs/database";
import { pgliteDatabase } from "@bgs/database/testing";
import { DEFAULT_REMOTE_CONFIG } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { contentStores, type ContentPaths } from "./content-stores";
import { FileArticleRepository } from "./file-article-repository";
import { PostgresArticleRepository } from "./postgres-article-repository";
import { PostgresProcedureRepository } from "./postgres-procedure-repository";
import { FileProcedureRepository } from "./procedure-repository";

describe("contentStores", () => {
  let dir: string;
  let paths: ContentPaths;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-contents-"));
    paths = {
      news: join(dir, "news.json"),
      procedures: join(dir, "procedures.json"),
      procedureThemes: join(dir, "procedure-themes.json"),
      stateServices: join(dir, "state-services.json"),
      remoteConfig: join(dir, "remote-config.json"),
      ingestionStatus: join(dir, "ingestion-status.json"),
    };
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps every content in its file when there is no database", async () => {
    const stores = contentStores(null, paths);
    expect(stores.articles).toBeInstanceOf(FileArticleRepository);
    expect(stores.procedures).toBeInstanceOf(FileProcedureRepository);
    await stores.remoteConfig.write(DEFAULT_REMOTE_CONFIG);
    expect(await stores.ingestionStatus.read()).toBeUndefined();
  });

  it("puts every content in the database when there is one", async () => {
    const database = await pgliteDatabase();
    await migrate(database);
    try {
      const stores = contentStores(database, paths);
      expect(stores.articles).toBeInstanceOf(PostgresArticleRepository);
      expect(stores.procedures).toBeInstanceOf(PostgresProcedureRepository);
      await stores.remoteConfig.write({ ...DEFAULT_REMOTE_CONFIG, minVersion: "2.0.0" });
      expect((await contentStores(database, paths).remoteConfig.read()).minVersion).toBe("2.0.0");
      expect(await stores.procedureThemes.read()).toMatchObject({ themes: [] });
      expect(await stores.stateServices.verified()).toEqual([]);
    } finally {
      await database.close();
    }
  });
});
