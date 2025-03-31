import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeActivity } from "../../api/practiceActivities"; // Adjust the import path as needed

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
      name: "sw-zstore-practice-activity",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
