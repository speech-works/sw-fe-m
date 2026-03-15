import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { 
  getDetailedWeeklySummary, 
  getWeeklyMoodReport,
  getUserStats
} from "../../api";
import { DetailedWeeklySummaryResponse } from "../../api/progressReport/types";
import { PracticeStatSummary } from "../../api/stats/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface ProgressReportState {
  detailedSummary: DetailedWeeklySummaryResponse | null;
  practiceStats: PracticeStatSummary[] | null;
  moodReport: Record<string, number> | null;
  
  loading: boolean;
  error: string | null;
  lastUpdated: number | null; // Timestamp
  
  // Track specific fetch failures for partial UI updates
  fetchErrors: {
    detailedSummary: boolean;
    practiceStats: boolean;
    moodReport: boolean;
  };

  fetchAllData: (userId: string, isRefresh?: boolean) => Promise<void>;
  clearProgressReport: () => void;
}

export const useProgressReportStore = create<ProgressReportState>()(
  persist(
    (set, get) => ({
      detailedSummary: null,
      practiceStats: null,
      moodReport: null,
      
      loading: false,
      error: null,
      lastUpdated: null,
      
      fetchErrors: {
        detailedSummary: false,
        practiceStats: false,
        moodReport: false,
      },

      fetchAllData: async (userId: string, isRefresh = false) => {
        // Only set loading if we don't have cached data or if it's an explicit refresh
        if (!get().detailedSummary || isRefresh) {
          set({ loading: true, error: null });
        }

        const newFetchErrors = {
          detailedSummary: false,
          practiceStats: false,
          moodReport: false,
        };

        try {
          const results = await Promise.allSettled([
            getDetailedWeeklySummary(userId),
            getUserStats(userId),
            getWeeklyMoodReport(userId),
          ]);

          const detailedSummaryResult = results[0];
          const practiceStatsResult = results[1];
          const moodReportResult = results[2];

          const updates: Partial<ProgressReportState> = {
            loading: false,
          };

          if (detailedSummaryResult.status === "fulfilled") {
            updates.detailedSummary = detailedSummaryResult.value;
          } else {
            newFetchErrors.detailedSummary = true;
          }

          if (practiceStatsResult.status === "fulfilled") {
            updates.practiceStats = practiceStatsResult.value;
          } else {
            newFetchErrors.practiceStats = true;
          }

          if (moodReportResult.status === "fulfilled") {
            updates.moodReport = moodReportResult.value;
          } else {
            newFetchErrors.moodReport = true;
          }

          // If all failed, set a global error
          if (Object.values(newFetchErrors).every(v => v === true)) {
            updates.error = "Failed to fetch any report data. Check your connection.";
          } else {
            // If at least some succeeded, update the lastUpdated timestamp
            updates.lastUpdated = Date.now();
          }

          set({ ...updates, fetchErrors: newFetchErrors });

        } catch (err: any) {
          console.error("Critical error in fetchAllData:", err);
          set({ 
            loading: false, 
            error: err.message || "Something went wrong",
            fetchErrors: {
              detailedSummary: true,
              practiceStats: true,
              moodReport: true,
            }
          });
        }
      },

      clearProgressReport: () => {
        set({
          detailedSummary: null,
          practiceStats: null,
          moodReport: null,
          loading: false,
          error: null,
          lastUpdated: null,
          fetchErrors: {
            detailedSummary: false,
            practiceStats: false,
            moodReport: false,
          }
        });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PROGRESS_REPORT,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
