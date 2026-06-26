import * as Haptics from "expo-haptics";

/**
 * Tactile feedback tokens. Use intent-named calls (not raw impact styles) so the
 * "feel" stays consistent: `haptics.selection()` when changing a choice,
 * `haptics.success()` on a completed action, `haptics.light()` on a tap, etc.
 * Each call is fire-and-forget and swallows the rare native rejection so it can
 * never crash a handler. No-ops gracefully where haptics aren't available.
 */
const safe = (fn: () => Promise<unknown>) => {
  try {
    fn().catch(() => {});
  } catch {
    // platform without haptics — ignore
  }
};

export const haptics = {
  /** Light tap — a button press, a toggle. */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium tap — a confirm, a meaningful commit. */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Heavy tap — a strong, deliberate action. */
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** Selection tick — moving through a slider/segmented/picker. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** Success notification — task complete, saved. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Warning notification — caution, undo window. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Error notification — failed action. */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
} as const;
