import type { Lang, PushSubscription, QuietHours } from "@bgs/shared-types";

export type NotificationChoice = "off" | "on";
export type QuietChoice = "on" | "off";

export const NOTIFICATION_CHOICES: readonly NotificationChoice[] = ["off", "on"];
export const QUIET_CHOICES: readonly QuietChoice[] = ["on", "off"];

/** Nothing at night by default (decision of 30/09/2026), Dakar time. */
export const QUIET_HOURS: QuietHours = { from: 22, to: 7 };

/**
 * What the API is told for this phone: every section (choosing sections was taken out
 * of the settings, owner's request of 15/10/2026), its quiet hours and its language.
 */
export function subscriptionFor(token: string, quiet: QuietChoice, lang: Lang): PushSubscription {
  return {
    token,
    topics: null,
    quietHours: quiet === "on" ? QUIET_HOURS : null,
    lang,
  };
}

export interface InvitationFacts {
  supported: boolean;
  invited: boolean;
  choice: NotificationChoice;
}

/**
 * Asked once, like a permission, on arriving at the front page (decision of the
 * user, 01/10/2026), never if already chosen.
 */
export function isInvitationDue({ supported, invited, choice }: InvitationFacts): boolean {
  return supported && !invited && choice === "off";
}
