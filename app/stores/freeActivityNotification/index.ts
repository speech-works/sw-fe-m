import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface FreeActivityNotificationState {
  /**
   * True while the user is sitting at exactly one free activity remaining and
   * we haven't yet completed the notification cycle for that threshold.
   */
  lowFreeActivityNotified: boolean;

  /**
   * True once the alert fires. The modal will be shown on the next safe screen.
   */
  freeActivityModalQueued: boolean;

  setLowFreeActivityNotified: (v: boolean) => void;
  setFreeActivityModalQueued: (v: boolean) => void;

  /**
   * Resets all state when the user gets replenished above the warning
   * threshold again, or when the warning becomes irrelevant (for example, the
   * user upgrades to paid).
   */
  resetAll: () => void;
}

export const useFreeActivityNotificationStore =
  create<FreeActivityNotificationState>()(
    persist(
      (set) => ({
        lowFreeActivityNotified: false,
        freeActivityModalQueued: false,

        setLowFreeActivityNotified: (v) => set({ lowFreeActivityNotified: v }),
        setFreeActivityModalQueued: (v) => set({ freeActivityModalQueued: v }),

        resetAll: () =>
          set({
            lowFreeActivityNotified: false,
            freeActivityModalQueued: false,
          }),
      }),
      {
        name: ASYNC_KEYS_NAME.SW_ZSTORE_FREE_ACTIVITY_NOTIFICATION,
        storage: createJSONStorage(() => AsyncStorage),
      },
    ),
  );
