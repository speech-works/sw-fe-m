import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeActivity } from "../../api/practiceActivities/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface PracticeActivityState {
  activities: PracticeActivity[];
  addActivity: (activity: PracticeActivity) => void;
  updateActivity: (
    activityId: string,
    activityUpdates: Partial<PracticeActivity>
  ) => void;
  clearActivities: () => void;
  doesActivityExist: (activityId: string) => boolean;
  isActivityCompleted: (activityId: string) => boolean;
}

export const useActivityStore = create<PracticeActivityState>()(
  persist(
    (set, get) => ({
      activities: [],

      addActivity: (activity) => {
        set((state) => {
          // Check if the activity already exists to avoid duplicates
          const existingActivity = state.activities.find(
            (a) => a.id === activity.id
          );
          if (existingActivity) {
            console.log(
              `Activity with ID ${activity.id} already exists. Not adding duplicate.`
            );
            return state;
          }
          console.log("Adding activity to zustand store", { activity });
          return { activities: [...state.activities, activity] };
        });
      },

      updateActivity: (activityId, activityUpdates) => {
        set((state) => {
          const updatedActivities = state.activities.map((activity) =>
            activity.id === activityId
              ? { ...activity, ...activityUpdates }
              : activity
          );
          console.log("Updating activity in zustand store", {
            activityId,
            activityUpdates,
            updatedActivities,
          });
          return { activities: updatedActivities };
        });
      },

      clearActivities: () => {
        console.log("Clearing all activities from zustand store");
        set({ activities: [] });
      },

      doesActivityExist: (activityId) => {
        const exists = get().activities.some(
          (activity) => activity.id === activityId
        );
        console.log(`Checking if activity ${activityId} exists: ${exists}`);
        return exists;
      },

      isActivityCompleted: (activityId) => {
        const activity = get().activities.find((a) => a.id === activityId);
        // An activity is considered completed if its 'completedAt' property is not null or undefined.
        const isCompleted = activity ? !!activity.completedAt : false;
        console.log(
          `Checking if activity ${activityId} is completed (based on completedAt): ${isCompleted}`
        );
        return isCompleted;
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_ACTIVITY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.activities) {
          // Apply recursive date parsing to each activity object loaded from storage
          state.activities = state.activities.map(
            (activity) => reviveDatesInObject(activity) as PracticeActivity // Cast to PracticeActivity
          );
          console.log("Rehydrated activities with dates revived", {
            rehydratedActivities: state.activities,
          });
        }
      },
    }
  )
);
