import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PracticeStatSummary } from "../../api/stats/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { reviveDatesInObject } from "../../util/functions/date";

interface PracticeStatsState {
  practiceStats: PracticeStatSummary[];
  setPracticeStats: (stats: PracticeStatSummary[]) => void;
  clearPracticeStats: () => void;
}

export const usePracticeStatsStore = create<PracticeStatsState>()(
  persist(
    (set) => ({
      practiceStats: [],

      setPracticeStats: (practiceStats) => {
        set({ practiceStats });
      },

      clearPracticeStats: () => {
        set({ practiceStats: [] });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_STATS,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.practiceStats?.length) {
          state.practiceStats = reviveDatesInObject(
            state.practiceStats
          ) as PracticeStatSummary[];
        }
      },
    }
  )
);
