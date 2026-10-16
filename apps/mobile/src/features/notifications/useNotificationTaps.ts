import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads one field of what may be an object, whatever came in. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** The article a notification's data announces, when it carries a well-formed one. */
export function articleIdOf(data: unknown): string | null {
  const id = field(data, "articleId");
  return typeof id === "string" && UUID.test(id) ? id : null;
}

/** The same, from a touched notification, read defensively (any shape may come). */
export function articleIdOfResponse(response: unknown): string | null {
  return articleIdOf(
    field(field(field(field(response, "notification"), "request"), "content"), "data"),
  );
}

/** The notification behind a response, to open each one once. */
export function responseKey(response: unknown): string | null {
  const identifier = field(field(field(response, "notification"), "request"), "identifier");
  return typeof identifier === "string" ? identifier : null;
}

/**
 * Responses already opened in this session: a cold start delivers the same one both
 * as the last response and to the listener, and the hook may mount again; each
 * opened the article once more on top of itself (audit of 15/10/2026).
 */
const opened = new Set<string>();

/** True the first time a response is seen; false for the same one again. */
export function firstTimeFor(response: unknown): boolean {
  const key = responseKey(response);
  if (key === null) {
    return true;
  }
  if (opened.has(key)) {
    return false;
  }
  opened.add(key);
  return true;
}

/**
 * Touching a notification opens its article, whether the app was closed or not.
 * One received while the app is open shows as a quiet banner (no sound).
 */
export function useNotificationTaps(): void {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web") {
      return undefined;
    }
    Notifications.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
    });
    const open = (response: unknown) => {
      const id = articleIdOfResponse(response);
      if (id !== null && firstTimeFor(response)) {
        router.push({ pathname: "/article/[id]", params: { id } });
      }
    };
    // The notification that opened the app, if one did. A failing push module
    // never stops the app from starting: the article is still one tap away.
    try {
      open(Notifications.getLastNotificationResponse());
    } catch {
      // Nothing to open.
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      subscription.remove();
    };
  }, [router]);
}
