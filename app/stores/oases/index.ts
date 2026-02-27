import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
    OasesDailyBatch
} from "../../api/oases/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys"; // Verify this key exists or create new one

interface OasesState {
  dailyBatch: OasesDailyBatch | null;
  answers: Record<string, number | string | string[]>; // Map questionID -> Value
  isTimerRunning: boolean;
  lastFetchedAt: string | null; // ISO Date string

  // Actions
  setDailyBatch: (batch: OasesDailyBatch) => void;
  setAnswer: (questionId: string, value: number | string | string[]) => void;
  resetOases: () => void;

  // Helpers
  isBatchComplete: () => boolean;
}

export const useOasesStore = create<OasesState>()(
  persist(
    (set, get) => ({
      dailyBatch: null,
      answers: {},
      isTimerRunning: false,
      lastFetchedAt: null,

      setDailyBatch: (batch) =>
        set({ dailyBatch: batch, lastFetchedAt: new Date().toISOString() }),

      setAnswer: (questionId, value) => {
        const prev = get().answers;
        set({ answers: { ...prev, [questionId]: value } });
      },

      resetOases: () =>
        set({
          dailyBatch: null,
          answers: {},
          isTimerRunning: false,
          lastFetchedAt: null,
        }),

      isBatchComplete: () => {
        const { dailyBatch, answers } = get();
        if (!dailyBatch) return false;

        // simple check: do we have an answer for every question?
        return dailyBatch.questions.every(
          (q) => answers[q.id] !== undefined && answers[q.id] !== "",
        );
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_OASES,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
