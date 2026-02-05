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
import { getOverallStateHistory } from "../../api/overallState";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";

interface UserBehaviorTrendsState {
  growthProfile: GrowthProfile | null;
  weeklyBreakthroughs: WeeklyBreakthroughs | null;
  historicalProfile: GrowthProfile | null; // 4-week-ago snapshot for ghost overlay
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
      historicalProfile: null,
      loading: false,
      error: null,

      fetchAllTrends: async () => {
        set({ loading: true, error: null });
        try {
          const [profile, breakthroughs] = await Promise.all([
            getGrowthProfile(),
            getWeeklyBreakthroughs(),
          ]);

          // Fetch 4-week historical data for ghost overlay
          let historicalProfile: GrowthProfile | null = null;
          try {
            const history = await getOverallStateHistory(4);
            // Get the oldest record (4 weeks ago)
            if (history && history.length > 0) {
              const oldest = history[history.length - 1];
              if (oldest.clinical?.domains) {
                // Convert clinical scores to growth profile (invert: 100 - score)
                const domains = oldest.clinical.domains;
                historicalProfile = {
                  mastery:
                    100 -
                    (domains[ClinicalDomain.IMPAIRMENT_STRUGGLE]?.score || 50),
                  ease:
                    100 -
                    (domains[ClinicalDomain.FUNCTIONAL_LIMITATION]?.score ||
                      50),
                  courage:
                    100 -
                    (domains[ClinicalDomain.AVOIDANCE_BEHAVIOR]?.score || 50),
                  confidence:
                    100 -
                    (domains[ClinicalDomain.AFFECTIVE_DISTRESS]?.score || 50),
                  social:
                    100 -
                    (domains[ClinicalDomain.PARTICIPATION_RESTRICTION]?.score ||
                      50),
                  lastUpdated: oldest.computedAt || null,
                };
              }
            }
          } catch (historyErr) {
            // History fetch is optional, don't fail the whole operation
            console.warn(
              "Could not fetch historical data for ghost overlay:",
              historyErr,
            );
          }

          set({
            growthProfile: profile,
            weeklyBreakthroughs: breakthroughs,
            historicalProfile,
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
          historicalProfile: null,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TRENDS,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
