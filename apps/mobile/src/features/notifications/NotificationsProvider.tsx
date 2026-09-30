import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { createPushClient } from "../../api/push-client";
import { usePersistentChoice } from "../../data/usePersistentChoice";
import { useTranslation } from "../../i18n/useTranslation";
import { SECTION_FILTERS } from "../news/category";
import { useUsageStats } from "../usage-stats/UsageStatsProvider";
import {
  isInvitationDue,
  NOTIFICATION_CHOICES,
  QUIET_CHOICES,
  subscriptionFor,
  topicsFromText,
  topicsToText,
  type NotificationChoice,
  type QuietChoice,
  type Topics,
} from "./notification-preferences";
import { askPermission, permission, pushSupported, pushToken } from "./push-registration";

const CHOICE_SLOT = "bgs-notifications";
const QUIET_SLOT = "bgs-notifications-quiet";
/** Whether the person has answered the invitation (or chosen in the settings). */
const INVITED_SLOT = "bgs-notifications-invited";
const INVITED: readonly ("no" | "yes")[] = ["no", "yes"];
/** The token last given to the API, to stop notifications when turned off. */
const TOKEN_SLOT = "bgs-push-token";
/** The sections followed: "all" or a list. */
const TOPICS_SLOT = "bgs-notifications-topics";

const client = createPushClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

export interface NotificationsState {
  /** False on the web, an emulator, or before the app's push project exists. */
  supported: boolean;
  choice: NotificationChoice;
  /** On asks the phone's permission first; off stops everything at once. */
  setChoice: (next: NotificationChoice) => void;
  quiet: QuietChoice;
  setQuiet: (next: QuietChoice) => void;
  /** Null: every section. */
  topics: Topics;
  setTopics: (next: Topics) => void;
  /** Turned on in the app, but refused in the phone's settings. */
  blocked: boolean;
  invitationDue: boolean;
  answerInvitation: (accepted: boolean) => void;
  /** The invitation was answered in this session: no other one follows it. */
  answeredThisSession: boolean;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

/** Tells the API what this phone wants; a failure is tried again at the next opening. */
async function synchronize(
  choice: NotificationChoice,
  quiet: QuietChoice,
  lang: "fr" | "wo",
  topics: Topics,
) {
  if (choice === "off") {
    const saved = await AsyncStorage.getItem(TOKEN_SLOT);
    if (saved !== null) {
      await client.unsubscribe(saved);
      await AsyncStorage.removeItem(TOKEN_SLOT);
    }
    return;
  }
  if ((await permission()) !== "granted") {
    return;
  }
  const token = await pushToken();
  if (token !== null) {
    await client.subscribe(subscriptionFor(token, quiet, lang, topics));
    await AsyncStorage.setItem(TOKEN_SLOT, token);
  }
}

/**
 * Notifications of new articles (PUSH-03): off until the person says yes, asked
 * once like a permission after a first article read. Every section by default,
 * nothing at night unless the person wants it. Nothing about the person is sent:
 * the phone's push token, its language and its quiet hours only.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { t, lang } = useTranslation();
  const { hasRead } = useUsageStats();
  const [choice, choose] = usePersistentChoice(CHOICE_SLOT, NOTIFICATION_CHOICES, "off");
  const [quiet, setQuiet] = usePersistentChoice(QUIET_SLOT, QUIET_CHOICES, "on");
  const [invited, markInvited] = usePersistentChoice(INVITED_SLOT, INVITED, "no");
  const [blocked, setBlocked] = useState(false);
  const [topics, chooseTopics] = useState<Topics>(null);
  useEffect(() => {
    AsyncStorage.getItem(TOPICS_SLOT).then(
      (saved) => {
        chooseTopics(topicsFromText(saved, SECTION_FILTERS));
      },
      () => undefined,
    );
  }, []);
  const setTopics = useCallback((next: Topics) => {
    chooseTopics(next);
    AsyncStorage.setItem(TOPICS_SLOT, topicsToText(next)).catch(() => undefined);
  }, []);
  const [answeredThisSession, setAnsweredThisSession] = useState(false);
  const supported = pushSupported();

  // Kept in step: at every change of choice, and when the app comes back (the
  // person may have changed the permission in the phone's settings meanwhile).
  useEffect(() => {
    if (!supported) {
      return undefined;
    }
    const refresh = () => {
      permission()
        .then((state) => {
          setBlocked(choice === "on" && state === "denied");
        })
        .catch(() => undefined);
      synchronize(choice, quiet, lang, topics).catch(() => undefined);
    };
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [supported, choice, quiet, lang, topics]);

  const setChoice = useCallback(
    (next: NotificationChoice) => {
      markInvited("yes");
      if (next === "off") {
        choose("off");
        return;
      }
      askPermission(t("notifications.channel"))
        .then((state) => {
          choose(state === "granted" ? "on" : "off");
          setBlocked(state === "denied");
        })
        .catch(() => undefined);
    },
    [choose, markInvited, t],
  );

  const value = useMemo(
    () => ({
      supported,
      choice,
      setChoice,
      quiet,
      setQuiet,
      topics,
      setTopics,
      blocked,
      invitationDue: isInvitationDue({ supported, invited: invited === "yes", choice, hasRead }),
      answerInvitation: (accepted: boolean) => {
        setAnsweredThisSession(true);
        setChoice(accepted ? "on" : "off");
      },
      answeredThisSession,
    }),
    [
      supported,
      choice,
      setChoice,
      quiet,
      setQuiet,
      topics,
      setTopics,
      blocked,
      invited,
      hasRead,
      answeredThisSession,
    ],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsState {
  const value = useContext(NotificationsContext);
  if (value === null) {
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return value;
}
