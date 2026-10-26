import { randomUUID } from "node:crypto";
import type { Database } from "@bgs/database";
import {
  ASSISTANT_FLAG_KEPT_DAYS,
  assistantFlagSchema,
  type AssistantFlag,
  type AssistantFlagSubmission,
} from "@bgs/shared-types";
import {
  type DocumentStore,
  FileDocumentStore,
  PostgresDocumentStore,
} from "../database/document-store";

export type AnswerFlagStore = DocumentStore<AssistantFlag>;

export class FileAnswerFlagStore extends FileDocumentStore<AssistantFlag> {
  constructor(path: string) {
    super(path, assistantFlagSchema, "flags");
  }
}

/** Any number: the instances changing the flags take turns. */
const FLAGS_LOCK = 20_261_025;

export class PostgresAnswerFlagStore extends PostgresDocumentStore<AssistantFlag> {
  constructor(database: Database) {
    super(database, assistantFlagSchema, "assistant_flags", FLAGS_LOCK);
  }
}

/** PostgreSQL when the API has a database, the file otherwise: the API and the bench. */
export function defaultAnswerFlagStore(database: Database | null, path: string): AnswerFlagStore {
  return database === null ? new FileAnswerFlagStore(path) : new PostgresAnswerFlagStore(database);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * « Signaler cette réponse » (AST-30e, owner's decisions of 19 and 25/10/2026): the
 * answers a person flagged, with their question and sources, read in the console and
 * asked again by the weekly bench. Nothing about the person is kept, and nothing is
 * kept past ASSISTANT_FLAG_KEPT_DAYS: expired flags are erased on every read and write.
 */
export class AnswerFlags {
  constructor(
    private readonly store: AnswerFlagStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async receive(submission: AssistantFlagSubmission): Promise<AssistantFlag> {
    const flag: AssistantFlag = {
      ...submission,
      id: randomUUID(),
      receivedAt: this.now().toISOString(),
    };
    await this.store.update((all) => ({ next: [...this.unexpired(all), flag], result: null }));
    return flag;
  }

  /** For the console: newest first. */
  list(): Promise<AssistantFlag[]> {
    return this.store.update((all) => {
      const kept = this.unexpired(all);
      return {
        next: kept,
        result: [...kept].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
      };
    });
  }

  private unexpired(flags: readonly AssistantFlag[]): AssistantFlag[] {
    const oldest = new Date(this.now().getTime() - ASSISTANT_FLAG_KEPT_DAYS * DAY_MS).toISOString();
    return flags.filter((flag) => flag.receivedAt >= oldest);
  }
}
