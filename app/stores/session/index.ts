import AsyncStorage from "@react-native-async-storage/async-storage";
import { isToday } from "date-fns";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
    PracticeSession,
    createSession,
    getAllSessionsOfUser,
} from "../../api/practiceSessions";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface PracticeSessionState {
  practiceSession: PracticeSession | null;
  hasHydrated: boolean;
  isSyncing: boolean;
  setSession: (session: PracticeSession) => void;
  clearSession: () => void;
  ensureActiveSession: (userId: string, forceRefresh?: boolean) => Promise<PracticeSession>;
}

export const useSessionStore = create<PracticeSessionState>()(
  persist(
    (set, get) => ({
      practiceSession: null,
      hasHydrated: false,
      isSyncing: false,

      setSession: (practiceSession) => {
        set({ practiceSession });
      },

      clearSession: () => {
        set({ practiceSession: null });
      },

      ensureActiveSession: async (userId: string, forceRefresh = false) => {
        const { practiceSession } = get();

        const isSessionToday = practiceSession?.createdAt
          ? isToday(new Date(practiceSession.createdAt))
          : false;

        if (
          !forceRefresh &&
          practiceSession &&
          practiceSession.status === "ONGOING" &&
          isSessionToday
        ) {
          return practiceSession;
        }

        set({ isSyncing: true });
        try {
          // 1. First, check if there's already an ONGOING session on the backend
          const activeSessions = await getAllSessionsOfUser({
            userId,
            sessionStatus: "ONGOING",
          });

          if (activeSessions && activeSessions.length > 0) {
            const existingSession = activeSessions[0];
            set({ practiceSession: existingSession });
            return existingSession;
          }

          // 2. If no active session exists on the backend, create a new one
          const newSession = await createSession({ userId });
          set({ practiceSession: newSession });
          return newSession;
        } catch (error) {
          console.error(
            "ensureActiveSession: Failed to ensure session:",
            error,
          );
          throw error;
        } finally {
          set({ isSyncing: false });
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
