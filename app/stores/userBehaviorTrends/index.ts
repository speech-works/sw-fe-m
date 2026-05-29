import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getCurrentOverallState,
  getOverallStateHistory,
} from "../../api/overallState";
import {
  OverallStateHistoryBucket,
  UserOverallStateAggregate,
} from "../../api/overallState/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import AsyncStorage from "@react-native-async-storage/async-storage";

let inflightTrendsRequest: Promise<void> | null = null;

interface UserBehaviorTrendsState {
  overallState: UserOverallStateAggregate | null;
  historyBuckets: OverallStateHistoryBucket[];
  loading: boolean;
  error: string | null;

  fetchAllTrends: () => Promise<void>;
  clearTrends: () => void;
}

export const useUserBehaviorTrendsStore = create<UserBehaviorTrendsState>()(
  persist(
    (set) => ({
      overallState: null,
      historyBuckets: [],
      loading: false,
      error: null,

      fetchAllTrends: async () => {
        if (inflightTrendsRequest) {
          return inflightTrendsRequest;
        }

        set({ loading: true, error: null });

        inflightTrendsRequest = (async () => {
          try {
            const [overallState, historyBuckets] = await Promise.all([
              getCurrentOverallState(),
              getOverallStateHistory(4),
            ]);

            set({
              overallState,
              historyBuckets,
              loading: false,
            });
          } catch (err: any) {
            console.error("Error fetching trends:", err);
            set({
              error: err.message || "Failed to fetch trends",
              loading: false,
            });
            throw err;
          } finally {
            inflightTrendsRequest = null;
          }
        })();

        return inflightTrendsRequest;
      },

      clearTrends: () => {
        inflightTrendsRequest = null;
        set({
          overallState: null,
          historyBuckets: [],
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TRENDS,
      version: 2,
      migrate: () => ({
        overallState: null,
        historyBuckets: [],
        loading: false,
        error: null,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
