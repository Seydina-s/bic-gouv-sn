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
      if (id !== null) {
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
