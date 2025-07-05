import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { MoodType } from "../../api/moodCheck/types";
import { getLocalTodayDateString } from "../../util/functions/date";

interface MoodCheckState {
  hasRecordedToday: boolean;
  moodType: MoodType | null;
  lastRecordedDate: string | null; // ISO date string for daily reset

  setMood: (mood: MoodType) => void;
  clearMood: () => void;
  checkAndResetIfNeeded: () => void;
}

export const useMoodCheckStore = create<MoodCheckState>()(
  persist(
    (set, get) => ({
      hasRecordedToday: false,
      moodType: null,
      lastRecordedDate: null,

      setMood: (mood: MoodType) => {
        const today = getLocalTodayDateString();
        set({
          hasRecordedToday: true,
          moodType: mood,
          lastRecordedDate: today,
        });
      },

      clearMood: () => {
        set({
          hasRecordedToday: false,
          moodType: null,
          lastRecordedDate: null,
        });
      },

      checkAndResetIfNeeded: () => {
        const today = getLocalTodayDateString();
        const lastDate = get().lastRecordedDate;
        console.log("checkAndResetIfNeeded run...", {
          today,
          lastDate,
          hasRecordedToday: get().hasRecordedToday,
        });

        if (lastDate !== today) {
          set({
            hasRecordedToday: false,
            moodType: null,
            lastRecordedDate: null,
          });
        }
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_MOOD_CHECK,
      storage: createJSONStorage(() => AsyncStorage),

      // We use `onRehydrateStorage` to ensure daily reset happens after loading
      onRehydrateStorage: () => (state) => {
        if (state) {
          const today = getLocalTodayDateString();
          if (state.lastRecordedDate !== today) {
            state.hasRecordedToday = false;
            state.moodType = null;
            state.lastRecordedDate = null;
          }
        }
      },
    }
  )
);
