import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface TourState {
  hasCompletedHomeTour: boolean;
  hasCompletedExploreTour: boolean;
  hasCompletedOverallTour: boolean;
  setHasCompletedHomeTour: (completed: boolean) => void;
  setHasCompletedExploreTour: (completed: boolean) => void;
  resetAllTours: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedHomeTour: false,
      hasCompletedExploreTour: false,
      hasCompletedOverallTour: false,
      setHasCompletedHomeTour: (completed) =>
        set((state) => ({
          hasCompletedHomeTour: completed,
          hasCompletedOverallTour: completed && state.hasCompletedExploreTour,
        })),
      setHasCompletedExploreTour: (completed) =>
        set((state) => ({
          hasCompletedExploreTour: completed,
          hasCompletedOverallTour: state.hasCompletedHomeTour && completed,
        })),
      resetAllTours: () =>
        set({
          hasCompletedHomeTour: false,
          hasCompletedExploreTour: false,
          hasCompletedOverallTour: false,
        }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOUR || "sw-zstore-tour",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
