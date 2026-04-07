import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { User } from "../../api/users";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";
import { useStaminaNotificationStore } from "../staminaNotification";
import { EVENT_NAMES } from "../events/constants";
import { dispatchCustomEvent } from "../../util/functions/events";

interface UserState {
  /** The current user object, or null if not loaded/logged in */
  user: User | null;
  setUser: (user: User) => void;
  updateProfilePicture: (uri: string) => void;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

/**
 * `persist` saves the user data is saved to AsyncStorage.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,

      setUser: (user) => {
        console.log("zustand store setting user", user);
        set({ user });
      },

      updateProfilePicture: (uri) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, profilePicture: uri } };
        }),

      fetchUser: async () => {
        try {
          const { getMyUser } = await import("../../api/users");
          const user = await getMyUser();
          console.log("zustand store fetching and setting user", user);
          set({ user });

          // --- Low Stamina Threshold Detection (phone-battery style) ---
          if (user.currentStamina !== undefined && user.maxStaminaCap) {
            const pct = (user.currentStamina / user.maxStaminaCap) * 100;
            const {
              lowStaminaNotified,
              setLowStaminaNotified,
              setStaminaModalQueued,
              resetAll,
            } = useStaminaNotificationStore.getState();

            // Fire once when crossing below 10% going downward
            if (pct < 10 && !lowStaminaNotified) {
              console.log(
                "[StaminaAlert] Stamina crossed below 10% →",
                pct.toFixed(1) + "%",
              );
              setLowStaminaNotified(true);
              setStaminaModalQueued(true);
              dispatchCustomEvent(EVENT_NAMES.STAMINA_ALERT_TRIGGERED);
            }

            // Re-arm: stamina recovered back above 10% — ready for next crossing
            if (pct >= 10 && lowStaminaNotified) {
              console.log(
                "[StaminaAlert] Stamina recovered above 10% → re-arming",
              );
              resetAll();
            }
          }
          // ---------------------------------------------------------------
        } catch (error) {
          console.error("UserStore fetchUser error:", error);
        }
      },

      clearUser: () => {
        set({ user: null });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_USER, // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      // To blacklist certain fields:
      // partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          console.log(
            "Zustand UserStore: Rehydrating user from storage. Raw:",
            JSON.stringify(state.user, null, 2),
          );
          state.user = reviveDatesInObject(state.user) as User | null;
          console.log(
            "Zustand UserStore: User AFTER rehydration parsing:",
            JSON.stringify(state.user, null, 2),
          );
        }
      },
    },
  ),
);
