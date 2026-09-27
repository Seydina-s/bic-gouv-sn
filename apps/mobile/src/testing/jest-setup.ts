// Shared Jest mocks for native modules that have no JavaScript implementation.
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
