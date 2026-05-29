import { Platform, Vibration } from "react-native";

/**
 * Triggers a "heartbeat" double-pulse vibration.
 * Used as the immediate tactile signal when stamina drops below 10%.
 * Uses the built-in Vibration API (expo-haptics not installed).
 */
export const triggerHeartbeatHaptic = () => {
  if (Platform.OS === "web") return;
  // Two quick pulses: [delay, on, off, on]
  Vibration.vibrate([0, 80, 60, 80]);
};
