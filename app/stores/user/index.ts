import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { User } from "../../api/users";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";
import { useFreeActivityNotificationStore } from "../freeActivityNotification";
import { useStaminaNotificationStore } from "../staminaNotification";
import { EVENT_NAMES } from "../events/constants";
import { dispatchCustomEvent } from "../../util/functions/events";
import { identifyUser } from "../../util/analytics/postHog";

interface UserState {
  /** The current user object, or null if not loaded/logged in */
  user: User | null;
  setUser: (user: User) => void;
  updateProfilePicture: (uri: string) => void;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

/**
 * Module-level in-flight guard — prevents concurrent fetchUser() calls from
 * reading stale notification flags and double-firing resource warning events.
 * (Bug Fix #4)
 */
let fetchUserInFlight = false;

/**
 * `persist` saves the user data is saved to AsyncStorage.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,

      setUser: (user) => {
        set({ user });
      },

      updateProfilePicture: (uri) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, profilePicture: uri } };
        }),

      fetchUser: async () => {
        // Bug Fix #4: Serialize concurrent fetchUser() calls.
        // Multiple activity screens call fetchUser() at different lifecycle
        // points. If two calls overlap, both can read lowStaminaNotified as
        // false before either writes true, causing a double-fire.
        if (fetchUserInFlight) {
          console.log("[UserStore] fetchUser already in-flight, skipping");
          return;
        }
        fetchUserInFlight = true;

        try {
          const [accessToken, refreshToken] = await Promise.all([
            SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_JWT_KEY),
            SecureStore.getItemAsync(SECURE_KEYS_NAME.SW_APP_REFRESH_TOKEN_KEY),
          ]);

          if (!accessToken && !refreshToken) {
            console.log("[UserStore] No stored session yet, skipping fetchUser");
            return;
          }

          const { getMyUser } = await import("../../api/users");
          const user = await getMyUser();
          set({ user });

          // Identify the user in PostHog with key segmentation traits.
          // All values come directly from the /users/me API response.
          // ⚠️  PII (email, name, phone, dob) and sensitive internal fields
          //     (password, stripeCustomerId, oauthId) are intentionally excluded.
          identifyUser(String(user.id), {
            // Subscription & access
            isPaid:              user.isPaid ?? null,
            isVerified:          user.isVerified ?? null,
            freeTasksRemaining:  user.freeTasksRemaining ?? null,
            // Onboarding
            hasOnboarded:        user.hasCompletedOnboarding ?? null,
            // Progression
            level:               user.level ?? null,
            totalXp:             user.totalXp ?? null,
            // Stamina
            staminaCap:          user.maxStaminaCap ?? null,
            currentStamina:      user.currentStamina ?? null,
            // Account age (enables cohort analysis by sign-up date)
            createdAt:           user.createdAt?.toISOString() ?? null,
          });
          // --- Low Stamina Threshold Detection (phone-battery style, paid only) ---
          if (
            user.isPaid &&
            user.currentStamina !== undefined &&
            user.maxStaminaCap
          ) {
            // Bug Fix #2: Wait for the persisted notification store to finish
            // loading from AsyncStorage before reading lowStaminaNotified.
            // On Android cold starts, hydration can lag behind the first
            // fetchUser() call (triggered by AppState or useFocusEffect),
            // making lowStaminaNotified appear false and bypassing the guard.
            if (!useStaminaNotificationStore.persist.hasHydrated()) {
              console.log(
                "[StaminaAlert] Notification store not yet hydrated — deferring detection",
              );
            } else {
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
                // Analytics: track low stamina alert for funnel analysis
                import("../../util/analytics/postHog").then(({ track }) => {
                  import("../../util/analytics/analyticsEvents").then(({ ANALYTICS_EVENTS }) => {
                    track(ANALYTICS_EVENTS.STAMINA_LOW_ALERT_SHOWN, { staminaPct: Math.round(pct) });
                  });
                });
              }

              // Re-arm: stamina recovered back above 10% — ready for next crossing
              if (pct >= 10 && lowStaminaNotified) {
                console.log(
                  "[StaminaAlert] Stamina recovered above 10% → re-arming",
                );
                resetAll();
              }
            }
          } else if (useStaminaNotificationStore.persist.hasHydrated()) {
            const {
              lowStaminaNotified,
              staminaModalQueued,
              resetAll,
            } = useStaminaNotificationStore.getState();

            if (lowStaminaNotified || staminaModalQueued) {
              console.log(
                "[StaminaAlert] Clearing stale stamina notification state",
              );
              resetAll();
            }
          }

          // --- Low Free Activity Threshold Detection (free users only) ---
          if (!user.isPaid && user.freeTasksRemaining !== undefined) {
            if (!useFreeActivityNotificationStore.persist.hasHydrated()) {
              console.log(
                "[FreeActivityAlert] Notification store not yet hydrated — deferring detection",
              );
            } else {
              const {
                lowFreeActivityNotified,
                freeActivityModalQueued,
                setLowFreeActivityNotified,
                setFreeActivityModalQueued,
                resetAll,
              } = useFreeActivityNotificationStore.getState();

              if (user.freeTasksRemaining === 1 && !lowFreeActivityNotified) {
                console.log(
                  "[FreeActivityAlert] Free activity dropped to 1 → queueing warning",
                );
                setLowFreeActivityNotified(true);
                setFreeActivityModalQueued(true);
                dispatchCustomEvent(EVENT_NAMES.FREE_ACTIVITY_ALERT_TRIGGERED);
              }

              if (
                user.freeTasksRemaining > 1 &&
                (lowFreeActivityNotified || freeActivityModalQueued)
              ) {
                console.log(
                  "[FreeActivityAlert] Free activity recovered above warning threshold → re-arming",
                );
                resetAll();
              }
            }
          } else if (useFreeActivityNotificationStore.persist.hasHydrated()) {
            const {
              lowFreeActivityNotified,
              freeActivityModalQueued,
              resetAll,
            } = useFreeActivityNotificationStore.getState();

            if (lowFreeActivityNotified || freeActivityModalQueued) {
              console.log(
                "[FreeActivityAlert] Clearing stale free activity notification state",
              );
              resetAll();
            }
          }
        } catch (error) {
          console.error("UserStore fetchUser error:", error);
        } finally {
          // Always release the lock so the next call can proceed.
          fetchUserInFlight = false;
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
          state.user = reviveDatesInObject(state.user) as User | null;
        }
      },
    },
  ),
);
