import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentStores,
  fileDocument,
  FileArticleRepository,
  FileProcedureRepository,
  RemoteConfigStore,
  type ContentPaths,
} from "@bgs/content-store";
import { migrate, type Database } from "@bgs/database";
import { pgliteDatabase } from "@bgs/database/testing";
import { DEFAULT_REMOTE_CONFIG, type NewsArticle, type Procedure } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importToDatabase } from "./import-to-database";

// Placeholder texts, not real content.
function article(n: number, hash: string): NewsArticle {
  const sourceUrl = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-20",
    sourceUpdatedAt: "2026-09-20T10:00:00Z",
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: hash.repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: `Titre ${String(n)}`,
        bodyHtml: "<p>Corps</p>",
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

function procedure(n: number): Procedure {
  const sourceUrl = `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-${String(n)}`;
  return {
    id: `00000000-0000-5000-9000-${String(n).padStart(12, "0")}`,
    kind: "procedure",
    slug: `test-${String(n)}`,
    sourceUrl,
    sourcePublishedOn: null,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-26T10:00:00Z",
    contentHash: "c".repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      { lang: "fr", status: "official", title: "Démarche", bodyHtml: "<p>É</p>", sourceUrl },
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
  };
}

describe("importToDatabase", () => {
  let dir: string;
  let database: Database;
  let paths: ContentPaths;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-import-"));
    database = await pgliteDatabase();
    await migrate(database);
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
    await database.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("copies every version of every article and procedure, and the documents", async () => {
    const files = new FileArticleRepository(paths.news);
    await files.save(article(1, "a"));
    await files.save(article(1, "b"));
    await files.save(article(2, "a"));
    await new FileProcedureRepository(paths.procedures).save(procedure(1));
    const remote = { ...DEFAULT_REMOTE_CONFIG, minVersion: "1.2.0" };
    await new RemoteConfigStore(fileDocument(paths.remoteConfig)).write(remote);

    const report = await importToDatabase(database, paths);
    expect(report.articles).toEqual({ imported: 2, present: 0 });
    expect(report.procedures).toEqual({ imported: 1, present: 0 });
    expect(report.documents).toMatchObject({ remoteConfig: "imported", stateServices: "absent" });

    const stores = contentStores(database, paths);
    const id = article(1, "a").id;
    expect((await stores.articles.get(id))?.version).toBe(2);
    expect((await stores.articles.history(id)).map((one) => one.version)).toEqual([1]);
    expect((await stores.articles.list({ limit: 10 })).total).toBe(2);
    expect(await stores.procedures.getBySlug("test-1")).not.toBeNull();
    expect((await stores.remoteConfig.read()).minVersion).toBe("1.2.0");
  });

  it("changes nothing already in the database when run again", async () => {
    await new FileArticleRepository(paths.news).save(article(1, "a"));
    await new RemoteConfigStore(fileDocument(paths.remoteConfig)).write(DEFAULT_REMOTE_CONFIG);
    await importToDatabase(database, paths);
    const stores = contentStores(database, paths);
    await stores.remoteConfig.write({ ...DEFAULT_REMOTE_CONFIG, minVersion: "9.9.9" });

    const again = await importToDatabase(database, paths);
    expect(again.articles).toEqual({ imported: 0, present: 1 });
    expect(again.documents.remoteConfig).toBe("present");
    expect((await stores.remoteConfig.read()).minVersion).toBe("9.9.9");
  });
});
