import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** Where new articles are announced on Android (a channel the person can tune). */
export const ARTICLES_CHANNEL = "articles";

export type PermissionState = "granted" | "denied" | "undetermined";

/** The project Expo's push service knows the app by: set by the first EAS build. */
function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined)
    ?.eas?.projectId;
  const id = typeof fromConfig === "string" ? fromConfig : Constants.easConfig?.projectId;
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Notifications need a real phone and the app's push project (web pages, emulators
 * and builds made before the EAS project exist cannot receive them).
 */
export function pushSupported(): boolean {
  return Platform.OS !== "web" && Device.isDevice && projectId() !== null;
}

function stateOf(status: Notifications.PermissionStatus): PermissionState {
  return status === Notifications.PermissionStatus.GRANTED
    ? "granted"
    : status === Notifications.PermissionStatus.DENIED
      ? "denied"
      : "undetermined";
}

export async function permission(): Promise<PermissionState> {
  return stateOf((await Notifications.getPermissionsAsync()).status);
}

/** The phone's own question: asked only after the person said yes in the app. */
export async function askPermission(channelName: string): Promise<PermissionState> {
  if (Platform.OS === "android") {
    // Android 13+ asks only once a channel exists.
    await Notifications.setNotificationChannelAsync(ARTICLES_CHANNEL, {
      name: channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return stateOf((await Notifications.requestPermissionsAsync()).status);
}

/** This installation's address at Expo's push service, or null when unavailable. */
export async function pushToken(): Promise<string | null> {
  const id = projectId();
  if (id === null) {
    return null;
  }
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch {
    // No network or no push service on this phone: tried again later.
    return null;
  }
}
