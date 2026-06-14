import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getPracticeCategorySummary } from "../../api/practiceCategories";
import { PracticeCategorySummaryItem } from "../../api/practiceCategories/types";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface PracticeCategorySummaryState {
  ownerUserId: string | null;
  categories: PracticeCategorySummaryItem[];
  comparisonLabel: string | null;
  loading: boolean;
  error: string | null;
  fetchSummary: (userId: string, isRefresh?: boolean) => Promise<void>;
  clearSummary: () => void;
}

let inFlightRequest:
  | {
      userId: string;
      request: Promise<void>;
    }
  | null = null;

export const usePracticeCategorySummaryStore =
  create<PracticeCategorySummaryState>()(
    persist(
      (set, get) => ({
        ownerUserId: null,
        categories: [],
        comparisonLabel: null,
        loading: false,
        error: null,

        fetchSummary: async (userId: string, isRefresh = false) => {
          if (inFlightRequest?.userId === userId && !isRefresh) {
            return inFlightRequest.request;
          }

          const state = get();
          if (state.ownerUserId && state.ownerUserId !== userId) {
            set({
              ownerUserId: userId,
              categories: [],
              comparisonLabel: null,
              loading: false,
              error: null,
            });
          }

          // `!` definite-assignment assertion: `request` is referenced inside the
          // async IIFE (for in-flight dedup) which tsc can't prove is assigned-first,
          // but the reference only runs after an `await`, by when assignment is done.
          let request!: Promise<void>;
          request = (async () => {
            set({ ownerUserId: userId, loading: true, error: null });
            try {
              const response = await getPracticeCategorySummary(userId);
              if (inFlightRequest?.request !== request) {
                return;
              }

              set({
                ownerUserId: userId,
                categories: response.categories,
                comparisonLabel: response.comparisonLabel,
                loading: false,
                error: null,
              });
            } catch (error: any) {
              if (inFlightRequest?.request !== request) {
                return;
              }

              set({
                loading: false,
                error: error?.message || "Failed to fetch practice summary",
              });
              throw error;
            } finally {
              if (inFlightRequest?.request === request) {
                inFlightRequest = null;
              }
            }
          })();

          inFlightRequest = { userId, request };
          return request;
        },

        clearSummary: () => {
          inFlightRequest = null;
          set({
            ownerUserId: null,
            categories: [],
            comparisonLabel: null,
            loading: false,
            error: null,
          });
        },
      }),
      {
        name: ASYNC_KEYS_NAME.SW_ZSTORE_PRACTICE_CATEGORY_SUMMARY,
        version: 1,
        storage: createJSONStorage(() => AsyncStorage),
        migrate: () => ({
          ownerUserId: null,
          categories: [],
          comparisonLabel: null,
          loading: false,
          error: null,
        }),
      },
    ),
  );
