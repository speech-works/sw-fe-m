import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getCurrentOverallState,
  getOverallStateHistory,
} from "../../api/overallState";
import { UserOverallStateAggregate } from "../../api/overallState/types";
import {
  getGrowthProfile,
  getWeeklyBreakthroughs,
} from "../../api/userBehaviorTrends";
import {
  ClinicalDomain,
  GrowthProfile,
  WeeklyBreakthroughs,
} from "../../api/userBehaviorTrends/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface UserBehaviorTrendsState {
  growthProfile: GrowthProfile | null;
  overallState: UserOverallStateAggregate | null;
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
      overallState: null,
      weeklyBreakthroughs: null,
      historicalProfile: null,
      loading: false,
      error: null,

      fetchAllTrends: async () => {
        set({ loading: true, error: null });
        try {
          const [profile, breakthroughs, overallState] = await Promise.all([
            getGrowthProfile(),
            getWeeklyBreakthroughs(),
            getCurrentOverallState(),
          ]);

          // Fetch 4-week historical data for ghost overlay
          let historicalProfile: GrowthProfile | null = null;
          try {
            const history = await getOverallStateHistory(4);
            // Get the oldest record (4 weeks ago)
            if (history && history.length > 0) {
              const oldest = history[history.length - 1];
              if (oldest.combined?.axes) {
                const axes = oldest.combined.axes;
                historicalProfile = {
                  mastery: axes.mastery ?? 50,
                  ease: axes.ease ?? 50,
                  courage: axes.courage ?? 50,
                  confidence: axes.confidence ?? 50,
                  social: axes.social ?? 50,
                  lastUpdated: oldest.computedAt || null,
                };
              } else if (oldest.clinical?.domains) {
                // Return to old computation fallback
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
            overallState,
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
