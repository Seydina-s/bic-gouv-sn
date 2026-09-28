import { readFile } from "node:fs/promises";
import { errorJournalFileSchema, type ErrorJournalEntry } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
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

/** Groups kept: beyond, the oldest group gives way (a flood never fills the disk). */
const MAX_GROUPS = 300;

/**
 * Errors the API answered, grouped by code and place, kept in memory and written
 * durably now and then (never on the request's path). Read by the console's error
 * journal (CLAUDE.md §4.5).
 */
export class ErrorJournal extends PeriodicallySaved {
  private readonly groups = new Map<string, ErrorJournalEntry>();

  private constructor(path: string) {
    super(path);
  }

  /** The journal saved at `path`, or an empty one (missing or unreadable file). */
  static async open(path: string): Promise<ErrorJournal> {
    const journal = new ErrorJournal(path);
    try {
      const saved = errorJournalFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
      for (const entry of saved.entries) {
        journal.groups.set(`${entry.code} ${entry.where}`, entry);
      }
    } catch {
      // Nothing saved yet, or damaged: the journal starts again.
    }
    return journal;
  }

  record(code: string, where: string, requestId: string | null, at = new Date()): void {
    const key = `${code} ${where}`;
    const seen = this.groups.get(key);
    const time = at.toISOString();
    if (seen !== undefined) {
      this.groups.delete(key);
    } else if (this.groups.size >= MAX_GROUPS) {
      const [oldest] = this.groups.keys();
      if (oldest !== undefined) {
        this.groups.delete(oldest);
      }
    }
    // Re-inserted last: the map's order is the order of the latest occurrence.
    this.groups.set(key, {
      code,
      where,
      count: (seen?.count ?? 0) + 1,
      firstAt: seen?.firstAt ?? time,
      lastAt: time,
      lastRequestId: requestId,
    });
    this.changed();
  }

  /** Latest first. */
  entries(): ErrorJournalEntry[] {
    return [...this.groups.values()].reverse();
  }

  protected snapshot() {
    return { schemaVersion: 1 as const, entries: [...this.groups.values()] };
  }
}
