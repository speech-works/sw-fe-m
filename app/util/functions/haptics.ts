import { haptics } from "../../design-system/haptics";

/** Gap between the two beats, so the pair reads as one heartbeat. */
const BEAT_GAP_MS = 160;

/**
 * The stamina alert: two beats close together, like a heartbeat.
 *
 * Routed through the design system's haptics rather than `Vibration` for two
 * reasons. It obeys the person's Vibration setting, which a raw call would walk
 * straight past. And `Vibration.vibrate([0, 80, 60, 80])` never produced that
 * pattern on iOS anyway: iOS ignores the timings and plays the full system
 * alert buzz for each entry.
 */
export const triggerHeartbeatHaptic = () => {
  haptics.heavy();
  setTimeout(() => haptics.heavy(), BEAT_GAP_MS);
};
