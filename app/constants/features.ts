import Constants from "expo-constants";

export const PAYMENTS_ENABLED =
  String(Constants.expoConfig?.extra?.PAYMENTS_ENABLED ?? "false").toLowerCase() ===
  "true";
