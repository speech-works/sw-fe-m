import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import {
  GrowthProfile,
  WeeklyBreakthroughs,
} from "../../api/userBehaviorTrends/types";
import {
  getGrowthProfile,
  getWeeklyBreakthroughs,
} from "../../api/userBehaviorTrends";

interface UserBehaviorTrendsState {
  growthProfile: GrowthProfile | null;
  weeklyBreakthroughs: WeeklyBreakthroughs | null;
  loading: boolean;
  error: string | null;

  fetchAllTrends: () => Promise<void>;
  clearTrends: () => void;
}

export const useUserBehaviorTrendsStore = create<UserBehaviorTrendsState>()(
  persist(
    (set) => ({
      growthProfile: null,
      weeklyBreakthroughs: null,
      loading: false,
      error: null,

      fetchAllTrends: async () => {
        set({ loading: true, error: null });
        try {
          const [profile, breakthroughs] = await Promise.all([
            getGrowthProfile(),
            getWeeklyBreakthroughs(),
          ]);

          set({
            growthProfile: profile,
            weeklyBreakthroughs: breakthroughs,
            loading: false,
          });
        } catch (err: any) {
          console.error("Error fetching trends:", err);
          set({
            error: err.message || "Failed to fetch trends",
            loading: false,
          });
        }
      },

      clearTrends: () => {
        set({
          growthProfile: null,
          weeklyBreakthroughs: null,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TRENDS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
