import { BellIcon as Bell } from "phosphor-react-native/src/icons/Bell";
import { ChartBarIcon as ChartBar } from "phosphor-react-native/src/icons/ChartBar";
import { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
import { useEffect, useState } from "react";
import { PermissionInvitation } from "../../components/PermissionInvitation";
import { useTranslation } from "../../i18n/useTranslation";
import { useLocation } from "../location/LocationProvider";
import { useOnboardingDone } from "../onboarding/OnboardingProvider";
import { useUsageStats } from "../usage-stats/UsageStatsProvider";
import { useNotifications } from "./NotificationsProvider";

/** The front page shows first; the invitations follow a moment later. */
export const WELCOME_DELAY_MS = 1200;

/** True while `active`, once it first held for `ms` without a break. */
function useHeldFor(active: boolean, ms: number): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active || held) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setHeld(true);
    }, ms);
    return () => {
      clearTimeout(timer);
    };
  }, [active, held, ms]);
  return active && held;
}

/**
 * The invitations of the app, on arriving at the front page once the welcome is
 * over (decision of the user, 01/10/2026): the notifications, then the location,
 * then the anonymous statistics, each asked once. One card whose content changes:
 * on a phone, a window opened just as another closes may never show. While the
 * phone asks its own question, the card steps aside.
 */
export function Invitations({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const notifications = useNotifications();
  const location = useLocation();
  const usage = useUsageStats();
  const { done } = useOnboardingDone();
  const ready = useHeldFor(visible && done === true, WELCOME_DELAY_MS);
  const [waiting, setWaiting] = useState(false);

  const steps = [
    {
      due: notifications.invitationDue,
      key: "notificationsInvite",
      icon: Bell,
      answer: notifications.answerInvitation,
    },
    {
      due: location.invitationDue,
      key: "locationInvite",
      icon: MapPin,
      answer: location.answerInvitation,
    },
    {
      due: usage.invitationDue,
      key: "usageInvite",
      icon: ChartBar,
      answer: usage.answerInvitation,
    },
  ] as const;
  const step = steps.find((candidate) => candidate.due);
  if (step === undefined) {
    return null;
  }
  return (
    <PermissionInvitation
      visible={ready && !waiting}
      icon={step.icon}
      title={t(`${step.key}.title`)}
      body={t(`${step.key}.body`)}
      note={t(`${step.key}.note`)}
      accept={t(`${step.key}.accept`)}
      decline={t(`${step.key}.decline`)}
      onAnswer={(accepted) => {
        setWaiting(true);
        step
          .answer(accepted)
          .catch(() => undefined)
          .finally(() => {
            setWaiting(false);
          });
      }}
    />
  );
}
