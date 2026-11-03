import { randomUUID } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { writeFileDurably } from "@bgs/content-store";
import { z } from "zod";

/** A ticket Expo gave for one phone: its receipt says later whether it arrived. */
export interface Issued {
  id: string;
  token: string;
}

/** The tickets of one sending, to read once their receipts are ready. */
export interface ReceiptBatch {
  key: string;
  /** When the receipts can be read (ms since 1970). */
  dueAt: number;
  issued: Issued[];
}

/**
 * The receipts still to read. Kept apart from the process: until 03/11/2026 they
 * waited in a timer, and an API restarted within 15 minutes of a sending never
 * learned whether the phones got it.
 */
export interface PendingReceiptStore {
  add(dueAt: number, issued: readonly Issued[]): Promise<void>;
  /** The batches whose receipts can be read at `now`, oldest first. */
  due(now: number): Promise<ReceiptBatch[]>;
  /** A batch read, or too old to be read: forgotten. */
  forget(key: string): Promise<void>;
}

const issuedSchema = z.array(z.object({ id: z.string().min(1), token: z.string().min(1) }));

/** Due time first in the name: the folder lists the batches in order, unread. */
const fileName = (dueAt: number) => `${String(dueAt).padStart(15, "0")}-${randomUUID()}.json`;
const dueAtOf = (name: string) => Number(name.slice(0, name.indexOf("-")));

/** One file per sending in a folder of the API's data. */
export class FilePendingReceiptStore implements PendingReceiptStore {
  constructor(private readonly folder: string) {}

  async add(dueAt: number, issued: readonly Issued[]): Promise<void> {
    await writeFileDurably(join(this.folder, fileName(dueAt)), JSON.stringify(issued));
  }

  async due(now: number): Promise<ReceiptBatch[]> {
    const names = (await this.names()).filter((name) => dueAtOf(name) <= now).sort();
    return Promise.all(
      names.map(async (key) => ({
        key,
        dueAt: dueAtOf(key),
        issued: issuedSchema.parse(JSON.parse(await readFile(join(this.folder, key), "utf8"))),
      })),
    );
  }

  async forget(key: string): Promise<void> {
    await rm(join(this.folder, key), { force: true });
  }

  private async names(): Promise<string[]> {
    try {
      return (await readdir(this.folder)).filter((name) => /^\d{15}-[\w-]+\.json$/.test(name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

/** In memory: for tests, and for a server without a data folder for them. */
export class MemoryPendingReceiptStore implements PendingReceiptStore {
  private readonly batches = new Map<string, ReceiptBatch>();

  add(dueAt: number, issued: readonly Issued[]): Promise<void> {
    const key = fileName(dueAt);
    this.batches.set(key, { key, dueAt, issued: [...issued] });
    return Promise.resolve();
  }

  due(now: number): Promise<ReceiptBatch[]> {
    return Promise.resolve(
      [...this.batches.values()]
        .filter((batch) => batch.dueAt <= now)
        .sort((a, b) => a.key.localeCompare(b.key)),
    );
  }

  forget(key: string): Promise<void> {
    this.batches.delete(key);
    return Promise.resolve();
  }
}
