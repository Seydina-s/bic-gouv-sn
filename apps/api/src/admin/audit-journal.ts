import { mkdir, open, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { chainEntry, type AuditEntry, type AuditInput } from "@bgs/admin-auth";

export interface AuditJournal {
  append(input: AuditInput): Promise<AuditEntry>;
  entries(): Promise<AuditEntry[]>;
}

/**
 * Append-only audit journal, one JSON entry per line, each chained to the previous
 * one (see @bgs/admin-auth). Lines are forced onto the disk before returning.
 * Appends are serialised so two actions never read the same "previous" entry.
 */
export class FileAuditJournal implements AuditJournal {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  append(input: AuditInput): Promise<AuditEntry> {
    const next = this.queue.then(() => this.write(input));
    this.queue = next.catch(() => undefined);
    return next;
  }

  async entries(): Promise<AuditEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
    return raw
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as AuditEntry);
  }

  private async write(input: AuditInput): Promise<AuditEntry> {
    const entry = chainEntry((await this.entries()).at(-1) ?? null, input);
    await mkdir(dirname(this.path), { recursive: true });
    const handle = await open(this.path, "a");
    try {
      await handle.appendFile(`${JSON.stringify(entry)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return entry;
  }
}
