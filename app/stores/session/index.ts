import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeSession } from "../../api/practiceSessions";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface PracticeSessionState {
  practiceSession: PracticeSession | null;
  hasHydrated: boolean;
  setSession: (session: PracticeSession) => void;
  clearSession: () => void;
}

export const useSessionStore = create<PracticeSessionState>()(
  persist(
    (set) => ({
      practiceSession: null,
      hasHydrated: false,

      setSession: (practiceSession) => {
        set({ practiceSession });
      },

      clearSession: () => {
        set({ practiceSession: null });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_SESSION, // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.practiceSession) {
          // This is where we transform the state after it's loaded from storage
          state.practiceSession = reviveDatesInObject(
            state.practiceSession
          ) as PracticeSession | null;
        }
        // Mark hydration as complete
        if (state) {
          state.hasHydrated = true;
        }
      },
    }
  )
);
