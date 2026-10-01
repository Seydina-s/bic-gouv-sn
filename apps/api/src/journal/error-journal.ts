import type { ErrorJournalEntry, ErrorResolution, ResolveError } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import {
  addGroups,
  type ErrorJournalStore,
  groupKey,
  latestGroups,
  MAX_GROUPS,
} from "./error-journal-store";
import { PeriodicallySaved } from "./periodically-saved";

/** The place of a request whose address matched no route. */
export const UNKNOWN_ROUTE = "(adresse inconnue)";

/** The error code of an answer's body, when it is one of our JSON errors. */
export function errorCodeOf(payload: unknown): string | null {
  if (typeof payload !== "string" || !payload.startsWith("{")) {
    return null;
  }
  try {
    const body: unknown = JSON.parse(payload);
    const code =
      typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

/**
 * Every error answer goes to the journal as it leaves (code, route pattern, request
 * id: never the address itself nor what was sent), and the journal is written when
 * the API stops.
 */
export function journalErrors(app: FastifyInstance, journal: ErrorJournal): void {
  app.addHook("onSend", (request, reply, payload, done) => {
    if (reply.statusCode >= 400) {
      const code = errorCodeOf(payload);
      if (code !== null) {
        const route = request.routeOptions.url;
        journal.record(
          code,
          route === undefined ? UNKNOWN_ROUTE : `${request.method} ${route}`,
          request.id,
        );
      }
    }
    done(null, payload);
  });
  app.addHook("onClose", async () => {
    await journal.close();
  });
}

/**
 * Errors the API answered, grouped by code and place. Counted in memory, then added
 * to the store now and then (never on the request's path): several API instances
 * journal into the same groups (SCALE-02). Read by the console's error journal
 * (CLAUDE.md §4.5).
 */
export class ErrorJournal extends PeriodicallySaved {
  /** Journaled here since the last save. */
  private pending = new Map<string, ErrorJournalEntry>();

  constructor(private readonly store: ErrorJournalStore) {
    super();
  }

  record(code: string, where: string, requestId: string | null, at = new Date()): void {
    const time = at.toISOString();
    addGroups(this.pending, [
      { code, where, count: 1, firstAt: time, lastAt: time, lastRequestId: requestId },
    ]);
    if (this.pending.size > MAX_GROUPS) {
      this.pending = new Map(
        latestGroups(this.pending.values()).map((group) => [groupKey(group), group]),
      );
    }
    this.changed();
  }

  /** Adds what was journaled here to the store; kept for the next save if it fails. */
  protected async save(): Promise<void> {
    const journaled = this.pending;
    this.pending = new Map();
    try {
      await this.store.add([...journaled.values()]);
    } catch (error) {
      addGroups(this.pending, journaled.values());
      throw error;
    }
  }

  /** Marks a group as fixed; what was journaled here is saved first, so it is found. */
  async resolve(target: ResolveError, resolution: ErrorResolution): Promise<boolean> {
    await this.flush();
    return this.store.resolve(target, resolution);
  }

  /** Latest first. */
  async entries(): Promise<ErrorJournalEntry[]> {
    const all = new Map<string, ErrorJournalEntry>();
    addGroups(all, await this.store.all());
    addGroups(all, this.pending.values());
    return latestGroups(all.values());
  }
}
