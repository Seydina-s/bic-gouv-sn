/**
 * Loads the native map only when it is shown: its library needs a native module
 * that Expo Go and the web do not have, and fails as soon as it is imported there.
 */
export function loadServiceMap() {
  return import("./ServiceMap");
}
