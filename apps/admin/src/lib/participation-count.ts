import type { ParticipationEntry } from "@bgs/shared-types";

/** Messages and reports of "Participer" nobody has read yet. */
export function unreadCount(entries: readonly ParticipationEntry[]): number {
  return entries.filter((entry) => entry.status === "new").length;
}
