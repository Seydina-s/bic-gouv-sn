import type * as MapOfflineModule from "./map-offline";
import type * as ServiceMapModule from "./ServiceMap";

/*
 * The native map's library needs a native module that Expo Go and the web do not
 * have, and fails as soon as it is evaluated there: it is required only when the
 * map is shown, which happens only where the module exists (nativeMapAvailable).
 * A plain require, not import(): no separate chunk to fetch, which a development
 * server in optimised mode cannot serve to a phone (ERREURS.md, 01/10/2026).
 * Only local files are required, never the package: see map-offline.ts.
 */

/** The map of "Près de moi", for React.lazy. */
export function loadServiceMap(): Promise<typeof ServiceMapModule> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  return Promise.resolve(require("./ServiceMap") as typeof ServiceMapModule);
}

/** The map's offline downloads, from the same library: only where the map shows. */
export function loadOfflineManager(): Promise<typeof MapOfflineModule.OfflineManager> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
  const library = require("./map-offline") as typeof MapOfflineModule;
  return Promise.resolve(library.OfflineManager);
}
