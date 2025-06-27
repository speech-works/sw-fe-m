import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

export enum MoodType {
  ANGRY = "ANGRY",
  CALM = "CALM",
  HAPPY = "HAPPY",
  SAD = "SAD",
}

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
        const today = new Date().toISOString().split("T")[0];
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
        const today = new Date().toISOString().split("T")[0];
        const lastDate = get().lastRecordedDate;

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
          const today = new Date().toISOString().split("T")[0];
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
