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
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { usePersistentChoice } from "../../data/usePersistentChoice";
import { activeSignal, readMemory, type Device } from "./usage-signals";

export type UsageConsent = "off" | "on";

const CONSENTS: readonly UsageConsent[] = ["off", "on"];
/** Where the choice and the calendar memory are kept on the phone (not secrets). */
const CONSENT_SLOT = "bgs-usage-stats";
const MEMORY_SLOT = "bgs-usage-memory";
// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";
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
  fetch(`${API_BASE}/v1/stats`, {
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

  const setConsent = useCallback(
    (next: UsageConsent) => {
      choose(next);
      if (next === "off") {
        AsyncStorage.removeItem(MEMORY_SLOT).catch(() => undefined);
      }
    },
    [choose],
  );

  const record = useCallback(
    (signal: UsageSignal) => {
      if (consent === "on") {
        send([signal]);
      }
    },
    [consent],
  );

  const value = useMemo(() => ({ consent, setConsent, record }), [consent, setConsent, record]);
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
