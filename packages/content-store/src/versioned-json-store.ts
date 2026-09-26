import { readFile } from "node:fs/promises";
import { z } from "zod";
import { writeFileDurably } from "./durable-file";

/** What the store needs from a content item: an id, a content fingerprint, a version. */
export interface Versioned {
  id: string;
  contentHash: string;
  version: number;
}

export interface VersionedEntry<T> {
  current: T;
  history: T[];
}

export type SaveOutcome = "created" | "updated" | "unchanged";

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && Reflect.get(error, "code") === "ENOENT";
}

const headerSchema = z.object({ schemaVersion: z.literal(1) });

/**
 * One JSON file of versioned items (`{ schemaVersion: 1, [collection]: { id: entry } }`),
 * validated on every read, written durably with a backup copy read back if the main
 * file is unreadable (e.g. zeroed by a power cut). Never overwrites silently: a
 * changed item keeps its previous versions in `history`. Single writer.
 * Provisional until PostgreSQL, behind the repository interfaces.
 */
export class VersionedJsonStore<T extends Versioned> {
  private readonly entriesSchema: z.ZodType<Record<string, VersionedEntry<T>>>;

  constructor(
    private readonly path: string,
    itemSchema: z.ZodType<T>,
    private readonly collection: string,
  ) {
    this.entriesSchema = z.record(
      z.string(),
      z.object({ current: itemSchema, history: z.array(itemSchema) }),
    );
  }

  async entries(): Promise<Record<string, VersionedEntry<T>>> {
    try {
      return await this.readFile(this.path);
    } catch (error) {
      try {
        return await this.readFile(this.backupPath);
      } catch (backupError) {
        if (isMissingFile(error) && isMissingFile(backupError)) {
          return {};
        }
        throw error;
      }
    }
  }

  async get(id: string): Promise<T | null> {
    return (await this.entries())[id]?.current ?? null;
  }

  async history(id: string): Promise<T[]> {
    return (await this.entries())[id]?.history ?? [];
  }

  /** Saves a new version only when the content fingerprint changed. */
  async save(item: T): Promise<SaveOutcome> {
    const entries = await this.entries();
    const existing = entries[item.id];
    if (existing?.current.contentHash === item.contentHash) {
      return "unchanged";
    }
    entries[item.id] =
      existing === undefined
        ? { current: { ...item, version: 1 }, history: [] }
        : {
            current: { ...item, version: existing.current.version + 1 },
            history: [...existing.history, existing.current],
          };
    await this.write(entries);
    return existing === undefined ? "created" : "updated";
  }

  /** Replaces the current version in place (enrichments such as images). */
  async replaceCurrent(id: string, update: (current: T) => T): Promise<boolean> {
    const entries = await this.entries();
    const entry = entries[id];
    if (entry === undefined) {
      return false;
    }
    entry.current = update(entry.current);
    await this.write(entries);
    return true;
  }

  private get backupPath(): string {
    return `${this.path}.bak`;
  }

  private async readFile(path: string): Promise<Record<string, VersionedEntry<T>>> {
    const raw: unknown = JSON.parse(await readFile(path, "utf8"));
    headerSchema.parse(raw);
    return this.entriesSchema.parse(Reflect.get(raw as object, this.collection) ?? {});
  }

  /** Main file then backup, each flushed to disk before it replaces the previous one. */
  private async write(entries: Record<string, VersionedEntry<T>>): Promise<void> {
    const data = JSON.stringify({ schemaVersion: 1, [this.collection]: entries });
    await writeFileDurably(this.path, data);
    await writeFileDurably(this.backupPath, data);
  }
}
