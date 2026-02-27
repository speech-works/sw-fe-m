import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MoodType } from "../../api/moodCheck/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { getLocalTodayDateString } from "../../util/functions/date";

interface MoodCheckState {
  hasRecordedToday: boolean;
  moodType: MoodType | null;
  lastRecordedDate: string | null; // ISO date string for daily reset
  lastPopupDate: string | null; // ISO date string for daily popup

  setMood: (mood: MoodType) => void;
  clearMood: () => void;
  setPopupShown: () => void;
  checkAndResetIfNeeded: () => void;
  _hasHydrated: boolean;
}

export const useMoodCheckStore = create<MoodCheckState>()(
  persist(
    (set, get) => ({
      hasRecordedToday: false,
      moodType: null,
      lastRecordedDate: null,
      lastPopupDate: null,
      _hasHydrated: false,

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

      setPopupShown: () => {
        const today = getLocalTodayDateString();
        console.log("MoodStore: setPopupShown called", { today });
        set({
          lastPopupDate: today,
        });
      },

      checkAndResetIfNeeded: () => {
        const today = getLocalTodayDateString();
        const lastDate = get().lastRecordedDate;

        if (lastDate !== today) {
          set({
            hasRecordedToday: false,
            moodType: null,
            lastRecordedDate: null,
            // We DO NOT reset lastPopupDate here because it should persist until the next day's check logic runs
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
          state._hasHydrated = true;
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
