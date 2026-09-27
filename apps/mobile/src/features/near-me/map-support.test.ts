import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, TurboModuleRegistry } from "react-native";
import { nativeMapAvailable } from "./map-support";

const original = { os: Platform.OS, environment: Constants.executionEnvironment };

function runIn(os: typeof Platform.OS, environment: ExecutionEnvironment): void {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  Object.defineProperty(Constants, "executionEnvironment", {
    value: environment,
    configurable: true,
  });
}

afterEach(() => {
  runIn(original.os, original.environment);
  jest.restoreAllMocks();
});

describe("native map availability", () => {
  it("shows the map in the app's own builds, where its native module exists", () => {
    runIn("ios", ExecutionEnvironment.Bare);
    const get = jest.spyOn(TurboModuleRegistry, "get").mockReturnValue({});
    expect(nativeMapAvailable()).toBe(true);
    expect(get).toHaveBeenCalledWith("MLRNMapViewModule");
  });

  it("keeps the list in a build made before the map", () => {
    runIn("android", ExecutionEnvironment.Standalone);
    jest.spyOn(TurboModuleRegistry, "get").mockReturnValue(null);
    expect(nativeMapAvailable()).toBe(false);
  });

  it("keeps the list in Expo Go and on the web", () => {
    const get = jest.spyOn(TurboModuleRegistry, "get").mockReturnValue({});
    runIn("ios", ExecutionEnvironment.StoreClient);
    expect(nativeMapAvailable()).toBe(false);
    runIn("web", ExecutionEnvironment.Bare);
    expect(nativeMapAvailable()).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });
});
