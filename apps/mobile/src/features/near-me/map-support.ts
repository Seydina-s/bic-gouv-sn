import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, TurboModuleRegistry } from "react-native";

/**
 * Native module of the map library (MapLibre). It exists only in the app's own
 * builds: never in Expo Go, never on the web, nor in a build made before the map.
 */
const MAP_MODULE = "MLRNMapViewModule";

/**
 * True when the native map can be shown. Otherwise "Près de moi" keeps its list,
 * which lists the same services: the app never opens on a broken map.
 */
export function nativeMapAvailable(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }
  return TurboModuleRegistry.get(MAP_MODULE) !== null;
}
