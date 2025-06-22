import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeActivity } from "../../api/practiceActivities"; // Adjust the import path as needed
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface PracticeActivityState {
  // The currently active practice activity, or null if none is active.
  activity: PracticeActivity | null;
  setActivity: (activity: PracticeActivity) => void;
  updateActivity: (activityUpdates: Partial<PracticeActivity>) => void;
  clearActivity: () => void;
}

export const useActivityStore = create<PracticeActivityState>()(
  persist(
    (set, get) => ({
      activity: null,

      setActivity: (activity) => set({ activity }),

      updateActivity: (activityUpdates) => {
        const currentActivity = get().activity;
        if (currentActivity) {
          set({ activity: { ...currentActivity, ...activityUpdates } });
        }
      },

      clearActivity: () => set({ activity: null }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_ACTIVITY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.activity) {
          console.log(
            "Zustand ActivityStore: Rehydrating activity from storage. Raw:",
            JSON.stringify(state.activity, null, 2)
          );
          // Apply recursive date parsing to the activity object loaded from storage
          state.activity = reviveDatesInObject(
            state.activity
          ) as PracticeActivity | null;
          console.log(
            "Zustand ActivityStore: Activity AFTER rehydration parsing:",
            JSON.stringify(state.activity, null, 2)
          );
        }
      },
    }
  )
);
