import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface TourState {
  hasCompletedHomeTour: boolean;
  hasCompletedExploreTour: boolean;
  setHasCompletedHomeTour: (completed: boolean) => void;
  setHasCompletedExploreTour: (completed: boolean) => void;
  resetAllTours: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedHomeTour: false,
      hasCompletedExploreTour: false,
      setHasCompletedHomeTour: (completed) =>
        set({ hasCompletedHomeTour: completed }),
      setHasCompletedExploreTour: (completed) =>
        set({ hasCompletedExploreTour: completed }),
      resetAllTours: () =>
        set({ hasCompletedHomeTour: false, hasCompletedExploreTour: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOUR || "sw-zstore-tour",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
