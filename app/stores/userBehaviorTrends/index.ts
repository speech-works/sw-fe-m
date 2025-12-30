import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import {
  ClinicalDomain,
  TrendsMap,
} from "../../api/userBehaviorTrends/types";
import { getUserBehaviorHistoricalTrend } from "../../api/userBehaviorTrends";

interface UserBehaviorTrendsState {
  trends: TrendsMap | null;
  loading: boolean;
  error: string | null;

  fetchAllTrends: () => Promise<void>;
  clearTrends: () => void;
}

export const useUserBehaviorTrendsStore = create<UserBehaviorTrendsState>()(
  persist(
    (set) => ({
      trends: null,
      loading: false,
      error: null,

      fetchAllTrends: async () => {
        set({ loading: true, error: null });
        try {
          // Fetch all domains in parallel using the user's API function
          const domains = Object.values(ClinicalDomain);
          const promises = domains.map((domain) =>
            getUserBehaviorHistoricalTrend(domain).catch((err) => {
              console.warn(`Failed to fetch trend for ${domain}`, err);
              return null;
            })
          );

          const results = await Promise.all(promises);
          
          const newTrends: TrendsMap = {};
          
          results.forEach((result) => {
            if (result) {
              newTrends[result.domain] = result;
            }
          });

          set({ trends: newTrends, loading: false });
        } catch (err: any) {
          console.error("Error fetching all trends:", err);
          set({ error: err.message || "Failed to fetch trends", loading: false });
        }
      },

      clearTrends: () => {
        set({ trends: null, loading: false, error: null });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TRENDS,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
