import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UsageSignal } from "@bgs/shared-types";
import Constants from "expo-constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { usePersistentChoice } from "../../data/usePersistentChoice";
import { activeSignal, readMemory, type Device } from "./usage-signals";
import { API_BASE_URL } from "../../api/base-url";

export type UsageConsent = "off" | "on";

const CONSENTS: readonly UsageConsent[] = ["off", "on"];
/** Where the choice and the calendar memory are kept on the phone (not secrets). */
const CONSENT_SLOT = "bgs-usage-stats";
const MEMORY_SLOT = "bgs-usage-memory";
/** Whether the person has answered the invitation (or chosen in the settings). */
const INVITED_SLOT = "bgs-usage-invited";
const INVITED: readonly ("no" | "yes")[] = ["no", "yes"];
const SEND_TIMEOUT_MS = 10_000;

/** Coarse context only: the system's major version, never a model or an identifier. */
function device(): Device {
  const raw =
    Platform.OS === "android"
      ? ((Platform.constants as { Release?: string }).Release ?? "0")
      : String(Platform.Version);
  const major = /^\d{1,3}/.exec(raw)?.[0] ?? "0";
  const version = Constants.expoConfig?.version ?? "0.0.0";
  return {
    platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
    osVersion: major,
    appVersion: /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(version) ? version : "0.0.0",
  };
}

/** Sends and forgets: a lost signal is only a count a little lower, never a retry storm. */
function send(signals: UsageSignal[]): void {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, SEND_TIMEOUT_MS);
  fetch(`${API_BASE_URL}/v1/stats`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signals }),
    signal: controller.signal,
  })
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(timer);
    });
}

export interface UsageStats {
  consent: UsageConsent;
  setConsent: (next: UsageConsent) => void;
  /** Counts an article read or listened to, only with the person's consent. */
  record: (signal: UsageSignal) => void;
  /**
   * True once, after a first article read, while the person has never been asked
   * nor chosen in the settings (like a permission, asked when it makes sense).
   */
  invitationDue: boolean;
  /** Yes turns the statistics on at once; either answer closes the invitation for good. */
  answerInvitation: (accepted: boolean) => Promise<void>;
  /** An article was read in this session (other invitations wait for it too). */
  hasRead: boolean;
}

const UsageStatsContext = createContext<UsageStats | null>(null);

/**
 * Anonymous usage statistics (ADM-12, CLAUDE.md: explicit consent): off until the
 * person turns them on in the settings. Then, when the app comes to the front, at
 * most one "active today" signal a day, and a signal per article read or listened
 * to. No identifier, no position; turning them off erases what the phone kept.
 */
export function UsageStatsProvider({ children }: { children: ReactNode }) {
  const [consent, choose] = usePersistentChoice(CONSENT_SLOT, CONSENTS, "off");
  const checking = useRef(false);

  useEffect(() => {
    if (consent !== "on") {
      return undefined;
    }
    const signalActive = async () => {
      if (checking.current) {
        return;
      }
      checking.current = true;
      try {
        const memory = readMemory(await AsyncStorage.getItem(MEMORY_SLOT));
        const result = activeSignal(memory, Date.now(), device());
        if (result !== null) {
          // Remembered first: a signal is never sent twice the same day.
          await AsyncStorage.setItem(MEMORY_SLOT, JSON.stringify(result.next));
          send([result.signal]);
        }
      } catch {
        // Storage unavailable: no signal today, nothing else changes.
      } finally {
        checking.current = false;
      }
    };
    void signalActive();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void signalActive();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [consent]);

  const [invited, markInvited] = usePersistentChoice(INVITED_SLOT, INVITED, "no");
  // On a phone, asked on arriving at the front page with the other invitations
  // (decision of the user, 01/10/2026); on the web preview, after a first article.
  const [hasRead, setHasRead] = useState(false);

  const setConsent = useCallback(
    (next: UsageConsent) => {
      choose(next);
      // A choice made in the settings answers the invitation too: never asked again.
      markInvited("yes");
      if (next === "off") {
        AsyncStorage.removeItem(MEMORY_SLOT).catch(() => undefined);
      }
    },
    [choose, markInvited],
  );

  const record = useCallback(
    (signal: UsageSignal) => {
      if (signal.type === "read") {
        setHasRead(true);
      }
      if (consent === "on") {
        send([signal]);
      }
    },
    [consent],
  );

  const value = useMemo(
    () => ({
      consent,
      setConsent,
      record,
      invitationDue: invited === "no" && consent === "off" && (Platform.OS !== "web" || hasRead),
      answerInvitation: (accepted: boolean) => {
        setConsent(accepted ? "on" : "off");
        return Promise.resolve();
      },
      hasRead,
    }),
    [consent, setConsent, record, invited, hasRead],
  );
  return <UsageStatsContext.Provider value={value}>{children}</UsageStatsContext.Provider>;
}

export function useUsageStats(): UsageStats {
  const value = useContext(UsageStatsContext);
  if (value === null) {
    throw new Error("useUsageStats must be used inside UsageStatsProvider");
  }
  return value;
}

/** Counts one read of an article when it is shown (once per article per screen). */
export function useRecordRead(articleId: string | undefined): void {
  const { record } = useUsageStats();
  useEffect(() => {
    if (articleId !== undefined) {
      record({ type: "read", articleId });
    }
  }, [articleId, record]);
}
