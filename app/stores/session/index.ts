import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeSession } from "../../api/practiceSessions";

interface PracticeSessionState {
  practiceSession: PracticeSession | null;

  setSession: (session: PracticeSession) => void;
  clearSession: () => void;
}

export const useSessionStore = create<PracticeSessionState>()(
  persist(
    (set) => ({
      practiceSession: null,

      setSession: (practiceSession) => {
        set({ practiceSession });
      },

      clearSession: () => {
        set({ practiceSession: null });
      },
    }),
    {
      name: "sw-zstore-practice-session", // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
