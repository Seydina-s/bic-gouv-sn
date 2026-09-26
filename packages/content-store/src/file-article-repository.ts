import { readFile } from "node:fs/promises";
import { newsArticleSchema, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import {
  compareNewestFirst,
  type ArticlePage,
  type ArticleRepository,
  type ListQuery,
  type SaveOutcome,
} from "./article-repository";
import { writeFileDurably } from "./durable-file";

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  articles: z.record(
    z.string(),
    z.object({ current: newsArticleSchema, history: z.array(newsArticleSchema) }),
  ),
});
type StoreFile = z.infer<typeof fileSchema>;

const EMPTY: StoreFile = { schemaVersion: 1, articles: {} };

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && Reflect.get(error, "code") === "ENOENT";
}

/**
 * Provisional store for the vertical slice: one JSON file, rewritten atomically
 * (temp file + rename) and validated on every read. Replaced by PostgreSQL in Phase 1
 * behind the same ArticleRepository interface. Single writer (the ingestion job).
 */
export class FileArticleRepository implements ArticleRepository {
  constructor(private readonly path: string) {}

  async get(id: string): Promise<NewsArticle | null> {
    return (await this.read()).articles[id]?.current ?? null;
  }

  async list({ lang, category, limit, cursor }: ListQuery): Promise<ArticlePage> {
    const all = Object.values((await this.read()).articles)
      .map((entry) => entry.current)
      .filter((article) => lang === undefined || article.translations.some((t) => t.lang === lang))
      .filter((article) => category === undefined || article.category === category)
      .sort(compareNewestFirst);
    const start = cursor === undefined ? 0 : all.findIndex((article) => article.id === cursor) + 1;
    const items = all.slice(start, start + limit);
    const last = items.at(-1);
    const hasMore = start + limit < all.length;
    return { items, nextCursor: hasMore && last !== undefined ? last.id : null };
  }

  async history(id: string): Promise<NewsArticle[]> {
    return (await this.read()).articles[id]?.history ?? [];
  }

  async save(article: NewsArticle): Promise<SaveOutcome> {
    const store = await this.read();
    const existing = store.articles[article.id];
    if (existing?.current.contentHash === article.contentHash) {
      return "unchanged";
    }
    store.articles[article.id] =
      existing === undefined
        ? { current: { ...article, version: 1 }, history: [] }
        : {
            current: { ...article, version: existing.current.version + 1 },
            history: [...existing.history, existing.current],
          };
    await this.write(store);
    return existing === undefined ? "created" : "updated";
  }

  async setImages(id: string, images: NewsArticle["images"]): Promise<boolean> {
    const store = await this.read();
    const entry = store.articles[id];
    if (entry === undefined) {
      return false;
    }
    entry.current = newsArticleSchema.parse({ ...entry.current, images });
    await this.write(store);
    return true;
  }

  private get backupPath(): string {
    return `${this.path}.bak`;
  }

  /**
   * Reads the store; if the main file is unreadable (e.g. zeroed by a power cut),
   * falls back to the backup copy, which every write keeps in sync.
   */
  private async read(): Promise<StoreFile> {
    try {
      return await readStoreFile(this.path);
    } catch (error) {
      try {
        return await readStoreFile(this.backupPath);
      } catch (backupError) {
        if (isMissingFile(error) && isMissingFile(backupError)) {
          return structuredClone(EMPTY);
        }
        throw error;
      }
    }
  }

  /** Main file then backup, each flushed to disk before it replaces the previous one. */
  private async write(store: StoreFile): Promise<void> {
    const data = JSON.stringify(store);
    await writeFileDurably(this.path, data);
    await writeFileDurably(this.backupPath, data);
  }
}

async function readStoreFile(path: string): Promise<StoreFile> {
  return fileSchema.parse(JSON.parse(await readFile(path, "utf8")));
}
