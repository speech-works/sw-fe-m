import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getLifetimeReport,
  getWeeklyReport,
} from "../../api/progressReport";
import {
  LifetimeReportResponse,
  WeeklyReportResponse,
} from "../../api/progressReport/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

type ReportTimeframe = "weekly" | "lifetime";

interface ProgressReportState {
  ownerUserId: string | null;
  weeklyReport: WeeklyReportResponse | null;
  lifetimeReport: LifetimeReportResponse | null;
  loading: Record<ReportTimeframe, boolean>;
  errors: Record<ReportTimeframe, string | null>;
  lastUpdated: Record<ReportTimeframe, number | null>;
  fetchReport: (
    userId: string,
    timeframe: ReportTimeframe,
    isRefresh?: boolean,
  ) => Promise<void>;
  clearProgressReport: () => void;
}

const DEFAULT_LOADING: Record<ReportTimeframe, boolean> = {
  weekly: false,
  lifetime: false,
};

const DEFAULT_ERRORS: Record<ReportTimeframe, string | null> = {
  weekly: null,
  lifetime: null,
};

const DEFAULT_LAST_UPDATED: Record<ReportTimeframe, number | null> = {
  weekly: null,
  lifetime: null,
};

const inFlightRequests: Record<
  ReportTimeframe,
  {
    userId: string;
    request: Promise<void>;
  } | null
> = {
  weekly: null,
  lifetime: null,
};

export const useProgressReportStore = create<ProgressReportState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      weeklyReport: null,
      lifetimeReport: null,
      loading: DEFAULT_LOADING,
      errors: DEFAULT_ERRORS,
      lastUpdated: DEFAULT_LAST_UPDATED,

      fetchReport: async (userId, timeframe, isRefresh = false) => {
        if (inFlightRequests[timeframe]?.userId === userId && !isRefresh) {
          return inFlightRequests[timeframe]!.request;
        }

        const state = get();
        if (state.ownerUserId && state.ownerUserId !== userId) {
          set({
            ownerUserId: userId,
            weeklyReport: null,
            lifetimeReport: null,
            loading: DEFAULT_LOADING,
            errors: DEFAULT_ERRORS,
            lastUpdated: DEFAULT_LAST_UPDATED,
          });
        }

        let request: Promise<void>;
        request = (async () => {
          set((state) => ({
            ownerUserId: userId,
            loading: {
              ...state.loading,
              [timeframe]: true,
            },
            errors: {
              ...state.errors,
              [timeframe]: null,
            },
          }));

          try {
            if (timeframe === "weekly") {
              const weeklyReport = await getWeeklyReport(userId);
              if (inFlightRequests.weekly?.request !== request) {
                return;
              }

              set((state) => ({
                ownerUserId: userId,
                weeklyReport,
                loading: {
                  ...state.loading,
                  weekly: false,
                },
                errors: {
                  ...state.errors,
                  weekly: null,
                },
                lastUpdated: {
                  ...state.lastUpdated,
                  weekly: Date.now(),
                },
              }));
            } else {
              const lifetimeReport = await getLifetimeReport(userId);
              if (inFlightRequests.lifetime?.request !== request) {
                return;
              }

              set((state) => ({
                ownerUserId: userId,
                lifetimeReport,
                loading: {
                  ...state.loading,
                  lifetime: false,
                },
                errors: {
                  ...state.errors,
                  lifetime: null,
                },
                lastUpdated: {
                  ...state.lastUpdated,
                  lifetime: Date.now(),
                },
              }));
            }
          } catch (error: any) {
            if (inFlightRequests[timeframe]?.request !== request) {
              return;
            }

            set((state) => ({
              loading: {
                ...state.loading,
                [timeframe]: false,
              },
              errors: {
                ...state.errors,
                [timeframe]:
                  error?.message ||
                  `Failed to fetch ${timeframe} progress report`,
              },
              }));
            throw error;
          } finally {
            if (inFlightRequests[timeframe]?.request === request) {
              inFlightRequests[timeframe] = null;
            }
          }
        })();

        inFlightRequests[timeframe] = { userId, request };
        return request;
      },

      clearProgressReport: () => {
        inFlightRequests.weekly = null;
        inFlightRequests.lifetime = null;
        set({
          ownerUserId: null,
          weeklyReport: null,
          lifetimeReport: null,
          loading: DEFAULT_LOADING,
          errors: DEFAULT_ERRORS,
          lastUpdated: DEFAULT_LAST_UPDATED,
        });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_PROGRESS_REPORT,
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: () => ({
        ownerUserId: null,
        weeklyReport: null,
        lifetimeReport: null,
        loading: DEFAULT_LOADING,
        errors: DEFAULT_ERRORS,
        lastUpdated: DEFAULT_LAST_UPDATED,
      }),
    },
  ),
);
