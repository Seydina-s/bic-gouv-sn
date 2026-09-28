/**
 * Loads the native map only when it is shown: its library needs a native module
 * that Expo Go and the web do not have, and fails as soon as it is imported there.
 */
export function loadServiceMap() {
  return import("./ServiceMap");
}

/** The map's offline downloads, from the same library: only where the map shows. */
export async function loadOfflineManager() {
  const { OfflineManager } = await import("@maplibre/maplibre-react-native");
  return OfflineManager;
}
