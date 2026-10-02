import Constants from "expo-constants";

/** Port of the API on the development computer. */
const DEVELOPMENT_API_PORT = 3100;

/**
 * Address of the API, read in one place. Builds give it in EXPO_PUBLIC_API_URL
 * (https in production). Without it, a phone served by the development computer
 * reaches the API on that same computer, at the address it already uses for the
 * app server: it follows the computer when its Wi-Fi address changes (ERREURS.md,
 * 02/10/2026). Nothing known (web, tests): relative addresses.
 */
export function apiBaseUrl(
  configured: string | undefined,
  devServerHost: string | undefined,
): string {
  if (configured !== undefined && configured !== "") {
    return configured;
  }
  const host = devServerHost?.replace(/:\d+$/, "");
  return host === undefined || host === "" ? "" : `http://${host}:${String(DEVELOPMENT_API_PORT)}`;
}

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
export const API_BASE_URL = apiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
);
