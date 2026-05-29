import Constants from "expo-constants";

export const PAYMENTS_ENABLED =
  String(Constants.expoConfig?.extra?.PAYMENTS_ENABLED ?? "false").toLowerCase() ===
  "true";

export const ALLOW_SIMULATOR_HEADSET_BYPASS =
  String(
    Constants.expoConfig?.extra?.ALLOW_SIMULATOR_HEADSET_BYPASS ?? "false",
  ).toLowerCase() === "true";
