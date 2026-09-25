// Shared Jest mocks for native modules that have no JavaScript implementation.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual<object>("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
