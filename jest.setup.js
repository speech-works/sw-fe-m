/**
 * Jest environment shims.
 *
 * Kept to the minimum needed to import application modules at all — this is not
 * a place to stub away real behaviour. Each entry exists because a NATIVE module
 * is absent under Jest, not because the code under test is awkward.
 */

// AsyncStorage is a native module; importing any persisted zustand store throws
// "NativeModule: AsyncStorage is null" without this. The package ships an
// in-memory implementation for precisely this case.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
