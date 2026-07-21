/**
 * The frontend had NO test runner at all until this file.
 *
 * Everything shipped here was verified by `tsc` plus manual calls against the
 * API, which is why four invented identifiers (`spacing.xxl`, `icons.calendar`,
 * `icons.list`, a `ProgramsStack` route that never existed) reached review and
 * were caught only by the compiler — and why nothing asserted that the shop
 * shows the price the server sent, or that a 402 routes somewhere real.
 *
 * DELIBERATELY A FLOOR, NOT A COVERAGE PUSH. The value is in the decision
 * logic that handles money and error routing: which offer is rendered, which
 * price, what a 402 does, how a skip reason is tallied. Full component-render
 * tests over a React Native tree cost far more to maintain than they catch, so
 * they are out of scope until something actually demands them.
 */
module.exports = {
  preset: "jest-expo",
  // Expo ships untranspiled ESM in node_modules; without this every import of
  // a react-native package fails on `export` syntax rather than on anything
  // wrong with our code.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)",
  ],
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  // ios/ and android/ contain vendored Pods JS with their own test files —
  // the same trap that makes plain `tsc` useless here (see tsconfig.check.json).
  testPathIgnorePatterns: [
    "/node_modules/",
    "/ios/",
    "/android/",
    "/.expo/",
    "/dist/",
  ],
  clearMocks: true,
};
