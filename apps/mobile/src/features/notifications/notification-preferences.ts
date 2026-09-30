import type { Lang, PushSubscription, QuietHours } from "@bgs/shared-types";

export type NotificationChoice = "off" | "on";
export type QuietChoice = "on" | "off";

export const NOTIFICATION_CHOICES: readonly NotificationChoice[] = ["off", "on"];
export const QUIET_CHOICES: readonly QuietChoice[] = ["on", "off"];

/** Nothing at night by default (decision of 30/09/2026), Dakar time. */
export const QUIET_HOURS: QuietHours = { from: 22, to: 7 };

/** Sections followed: null means every section (the default, decision of 30/09/2026). */
export type Topics = readonly string[] | null;

/**
 * Touching a chip: "every section" selects them all; a section alone first, then
 * added or removed. Removing the last one goes back to every section: a tap never
 * stops the notifications by mistake (turning them off is its own choice).
 */
export function toggleTopic(current: Topics, topic: string | null): Topics {
  if (topic === null) {
    return null;
  }
  if (current === null) {
    return [topic];
  }
  const next = current.includes(topic)
    ? current.filter((item) => item !== topic)
    : [...current, topic];
  return next.length === 0 ? null : next;
}

/** Stored as text on the phone: "all", or the sections separated by commas. */
export function topicsToText(topics: Topics): string {
  return topics === null ? "all" : topics.join(",");
}

/** Only sections the app knows are kept; anything unreadable means every section. */
export function topicsFromText(text: string | null, known: readonly string[]): Topics {
  if (text === null || text === "all") {
    return null;
  }
  const topics = text.split(",").filter((item) => known.includes(item));
  return topics.length === 0 ? null : topics;
}

/** What the API is told for this phone: its sections, quiet hours and reading language. */
export function subscriptionFor(
  token: string,
  quiet: QuietChoice,
  lang: Lang,
  topics: Topics = null,
): PushSubscription {
  return {
    token,
    topics: topics === null ? null : [...topics],
    quietHours: quiet === "on" ? QUIET_HOURS : null,
    lang,
  };
}

export interface InvitationFacts {
  supported: boolean;
  invited: boolean;
  choice: NotificationChoice;
  /** An article was read in this session: the app has shown its worth. */
  hasRead: boolean;
}

/** Asked once, like a permission, after a first article read, never if already chosen. */
export function isInvitationDue({ supported, invited, choice, hasRead }: InvitationFacts): boolean {
  return supported && !invited && choice === "off" && hasRead;
}
