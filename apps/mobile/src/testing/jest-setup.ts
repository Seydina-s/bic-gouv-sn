// Shared Jest mocks for native modules that have no JavaScript implementation.

// React Native gives phones an idle callback (requestIdleCallback); the test
// environment has none: an idle moment is the next turn of the timers here.
globalThis.requestIdleCallback = (callback: IdleRequestCallback) =>
  setTimeout(() => {
    callback({ didTimeout: false, timeRemaining: () => 0 });
  }, 0);
globalThis.cancelIdleCallback = (handle: number) => {
  clearTimeout(handle);
};
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual<object>("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The network is Wi-Fi in tests: the data saver's "mobile only" choice stays off
// (its rule is tested on its own, see data-saver.test.ts).
jest.mock("expo-network", () => {
  const { NetworkStateType } = jest.requireActual<{ NetworkStateType: Record<string, string> }>(
    "expo-network/build/Network.types",
  );
  return {
    NetworkStateType,
    useNetworkState: () => ({ type: NetworkStateType["WIFI"], isConnected: true }),
  };
});

// The sliding panel of "Près de moi" (native gestures and animations): its own mock.
// (Marked as an ES module: its default export is the panel itself.)
jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  ...jest.requireActual<object>("@gorhom/bottom-sheet/mock"),
}));
// Reanimated 4 runs on worklets: both have their own mocks.
jest.mock("react-native-worklets", () =>
  jest.requireActual<object>("react-native-worklets/src/mock"),
);
jest.mock("react-native-reanimated", () =>
  jest.requireActual<object>("react-native-reanimated/mock"),
);
