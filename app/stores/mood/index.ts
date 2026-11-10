import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getTodayMood } from "../../api/moodCheck";
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
  /** Asks the server if today is answered. True when answered (here or on another phone). */
  syncFromServer: () => Promise<boolean>;
  _hasHydrated: boolean;
}

// One request at a time: Home and the popup both ask on the same visit.
let inflightSync: Promise<boolean> | null = null;

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

      // The phone's flag is the fast path. The server answer wins when it says
      // answered, so a second phone stops asking. If the server cannot say
      // (offline, older server), the phone's flag stands. (D2, 10 Nov 2026)
      syncFromServer: async () => {
        if (get().hasRecordedToday) return true;
        if (!inflightSync) {
          inflightSync = (async () => {
            const res = await getTodayMood();
            if (res?.answered) {
              set({
                hasRecordedToday: true,
                moodType: res.mood,
                lastRecordedDate: getLocalTodayDateString(),
              });
              return true;
            }
            return get().hasRecordedToday;
          })().finally(() => {
            inflightSync = null;
          });
        }
        return inflightSync;
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
