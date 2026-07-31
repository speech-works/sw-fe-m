import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { isNotificationPermissionGranted } from "../../util/functions/notifications";

/**
 * How long "Not now" quiets the urgency. The row itself never leaves — the
 * setting stays where the user last saw it — but the dot and the warning
 * styling stand down, and come back after this, in case the situation changed
 * or the dismissal was a mis-tap.
 */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

interface NotificationPermissionState {
  /** null until the first read — "unknown", which must never look like "denied". */
  granted: boolean | null;
  /** Epoch ms until which urgency is suppressed. */
  snoozedUntil: number | null;
  /** Whether we have already made the one proactive ask. */
  hasAsked: boolean;

  refresh: () => Promise<void>;
  snooze: () => void;
  markAsked: () => void;
}

export const useNotificationPermissionStore =
  create<NotificationPermissionState>()(
    persist(
      (set) => ({
        granted: null,
        snoozedUntil: null,
        hasAsked: false,

        // Called on mount and on every foreground: the user can flip this in
        // system settings at any time, and the app is never told.
        refresh: async () => {
          set({ granted: await isNotificationPermissionGranted() });
        },

        snooze: () => set({ snoozedUntil: Date.now() + SNOOZE_MS }),
        markAsked: () => set({ hasAsked: true }),
      }),
      {
        name: ASYNC_KEYS_NAME.SW_ZSTORE_NOTIFICATION_PERMISSION,
        storage: createJSONStorage(() => AsyncStorage),
        // `granted` is deliberately NOT persisted — it is OS state, not ours,
        // and a stale `false` from last launch would flash a warning at someone
        // who has since enabled notifications.
        partialize: (s) => ({
          snoozedUntil: s.snoozedUntil,
          hasAsked: s.hasAsked,
        }),
      },
    ),
  );

/**
 * Is the setting relevant at all? True only once we KNOW permission is missing
 * — `null` (not yet read) deliberately shows nothing rather than guessing.
 */
export const selectShowNotificationRow = (
  s: NotificationPermissionState,
): boolean => s.granted === false;

/**
 * Should it be marked urgent — the dot on the dock, the warning styling on the
 * row? Same condition, minus an active snooze.
 */
export const selectNotificationsNeedAttention = (
  s: NotificationPermissionState,
): boolean =>
  s.granted === false && (s.snoozedUntil === null || Date.now() > s.snoozedUntil);
