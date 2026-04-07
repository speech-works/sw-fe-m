import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface StaminaNotificationState {
  /**
   * True while stamina is below 10% and we haven't yet shown the modal
   * for this crossing event. Prevents re-triggering during the same dip.
   */
  lowStaminaNotified: boolean;

  /**
   * True once the alert fires. The modal will be shown on the next
   * "safe screen" (Home / Explore / Settings / Community).
   */
  staminaModalQueued: boolean;

  setLowStaminaNotified: (v: boolean) => void;
  setStaminaModalQueued: (v: boolean) => void;

  /**
   * Resets all state — called when:
   * (a) Stamina recovers back above 10% (re-arm for next crossing), or
   * (b) Modal is shown and dismissed (completed cycle).
   */
  resetAll: () => void;
}

export const useStaminaNotificationStore = create<StaminaNotificationState>()(
  persist(
    (set) => ({
      lowStaminaNotified: false,
      staminaModalQueued: false,

      setLowStaminaNotified: (v) => set({ lowStaminaNotified: v }),
      setStaminaModalQueued: (v) => set({ staminaModalQueued: v }),

      resetAll: () =>
        set({ lowStaminaNotified: false, staminaModalQueued: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_STAMINA_NOTIFICATION,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
