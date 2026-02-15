import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PracticeSession, createSession } from "../../api/practiceSessions";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";
import { isToday } from "date-fns";

interface PracticeSessionState {
  practiceSession: PracticeSession | null;
  hasHydrated: boolean;
  setSession: (session: PracticeSession) => void;
  clearSession: () => void;
  ensureActiveSession: (userId: string) => Promise<PracticeSession>;
}

export const useSessionStore = create<PracticeSessionState>()(
  persist(
    (set, get) => ({
      practiceSession: null,
      hasHydrated: false,

      setSession: (practiceSession) => {
        set({ practiceSession });
      },

      clearSession: () => {
        set({ practiceSession: null });
      },

      ensureActiveSession: async (userId: string) => {
        const { practiceSession } = get();

        const isSessionToday = practiceSession?.createdAt
          ? isToday(new Date(practiceSession.createdAt))
          : false;

        console.log("ensureActiveSession: Checking session status...", {
          currentSessionId: practiceSession?.id,
          status: practiceSession?.status,
          createdAt: practiceSession?.createdAt,
          isToday: isSessionToday,
          userId,
        });

        if (
          practiceSession &&
          practiceSession.status === "ONGOING" &&
          isSessionToday
        ) {
          console.log(
            "ensureActiveSession: Session is valid and active. Reusing:",
            practiceSession.id,
          );
          return practiceSession;
        }

        console.log(
          "ensureActiveSession: Session is stale, missing, or completed. Creating new session for user:",
          userId,
        );
        try {
          const newSession = await createSession({ userId });
          set({ practiceSession: newSession });
          console.log(
            "ensureActiveSession: New session created and set:",
            newSession.id,
          );
          return newSession;
        } catch (error) {
          console.error(
            "ensureActiveSession: Failed to create session:",
            error,
          );
          throw error;
        }
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_SESSION, // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.practiceSession) {
          // This is where we transform the state after it's loaded from storage
          state.practiceSession = reviveDatesInObject(
            state.practiceSession,
          ) as PracticeSession | null;
        }
        // Mark hydration as complete
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);
