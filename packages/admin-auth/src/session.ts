import { createHash, randomBytes } from "node:crypto";

/** Short sessions (CLAUDE.md §4.5): signed out after 30 min idle, and after 8 h at most. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

export interface Session {
  /** SHA-256 of the token: a leaked session store cannot be replayed. */
  tokenHash: string;
  userId: string;
  createdAt: number;
  lastSeenAt: number;
}

/** Token for the cookie (256 random bits) and the session to store (its hash only). */
export function openSession(userId: string, nowMs: number): { token: string; session: Session } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    session: { tokenHash: hashToken(token), userId, createdAt: nowMs, lastSeenAt: nowMs },
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function isSessionAlive(session: Session, nowMs: number): boolean {
  return (
    nowMs - session.lastSeenAt <= SESSION_IDLE_MS && nowMs - session.createdAt <= SESSION_MAX_MS
  );
}

/** The session after a request: idle time restarts, the 8 h limit does not move. */
export function touchSession(session: Session, nowMs: number): Session {
  return { ...session, lastSeenAt: nowMs };
}
