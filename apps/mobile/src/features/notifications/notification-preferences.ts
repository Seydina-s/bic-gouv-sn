import type { Lang, PushSubscription, QuietHours } from "@bgs/shared-types";

export type NotificationChoice = "off" | "on";
export type QuietChoice = "on" | "off";

export const NOTIFICATION_CHOICES: readonly NotificationChoice[] = ["off", "on"];
export const QUIET_CHOICES: readonly QuietChoice[] = ["on", "off"];

/** Nothing at night by default (decision of 30/09/2026), Dakar time. */
export const QUIET_HOURS: QuietHours = { from: 22, to: 7 };

/**
 * What the API is told for this phone: every section (the default, decision of
 * 30/09/2026), its quiet hours and its reading language.
 */
export function subscriptionFor(token: string, quiet: QuietChoice, lang: Lang): PushSubscription {
  return { token, topics: null, quietHours: quiet === "on" ? QUIET_HOURS : null, lang };
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
