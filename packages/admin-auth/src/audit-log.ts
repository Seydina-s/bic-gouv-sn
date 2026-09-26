import { createHash } from "node:crypto";

/**
 * Audit journal (CLAUDE.md §1: "journal d'audit immuable"). Entries are only ever
 * appended, and each one carries the hash of the previous one: changing or removing
 * a past entry breaks the chain, which `firstBrokenEntry` reveals.
 */
export interface AuditInput {
  at: string;
  /** Account that acted, or "system". */
  actor: string;
  /** What was done, e.g. "sign-in", "procedure.theme.validated". */
  action: string;
  /** What it was done on, e.g. a procedure slug; null when none. */
  target: string | null;
  details: Record<string, string | number | boolean | null>;
}

export interface AuditEntry extends AuditInput {
  previousHash: string;
  hash: string;
}

/** Hash of the start of the chain. */
export const GENESIS = "0".repeat(64);

function hashOf(input: AuditInput, previousHash: string): string {
  // Fixed field order: the same entry always gives the same hash.
  const canonical = JSON.stringify([
    previousHash,
    input.at,
    input.actor,
    input.action,
    input.target,
    Object.entries(input.details).sort(([a], [b]) => a.localeCompare(b)),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function chainEntry(previous: AuditEntry | null, input: AuditInput): AuditEntry {
  const previousHash = previous?.hash ?? GENESIS;
  return { ...input, previousHash, hash: hashOf(input, previousHash) };
}

/** Index of the first altered entry, or -1 when the whole journal is intact. */
export function firstBrokenEntry(entries: readonly AuditEntry[]): number {
  let previousHash = GENESIS;
  for (const [index, entry] of entries.entries()) {
    if (entry.previousHash !== previousHash || entry.hash !== hashOf(entry, previousHash)) {
      return index;
    }
    previousHash = entry.hash;
  }
  return -1;
}
