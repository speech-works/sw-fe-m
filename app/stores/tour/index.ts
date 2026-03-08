import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface TourState {
  hasCompletedHomeTour: boolean;
  hasCompletedExploreTour: boolean;
  hasCompletedOverallTour: boolean;
  activeTourKey: "home" | "explore" | null;
  activeTourMaxSteps: number;
  setHasCompletedHomeTour: (completed: boolean) => void;
  setHasCompletedExploreTour: (completed: boolean) => void;
  setActiveTour: (key: "home" | "explore" | null, maxSteps: number) => void;
  resetAllTours: () => void;
  resetHomeTour: () => void;
  resetExploreTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedHomeTour: false,
      hasCompletedExploreTour: false,
      hasCompletedOverallTour: false,
      activeTourKey: null,
      activeTourMaxSteps: 8,
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
      setActiveTour: (key, maxSteps) =>
        set({ activeTourKey: key, activeTourMaxSteps: maxSteps }),
      resetAllTours: () =>
        set({
          hasCompletedHomeTour: false,
          hasCompletedExploreTour: false,
          hasCompletedOverallTour: false,
          activeTourKey: null,
          activeTourMaxSteps: 8,
        }),
      resetHomeTour: () =>
        set({
          hasCompletedHomeTour: false,
          activeTourKey: null,
        }),
      resetExploreTour: () =>
        set({
          hasCompletedExploreTour: false,
          activeTourKey: null,
        }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOUR || "sw-zstore-tour",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
