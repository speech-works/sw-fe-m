import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface TourState {
  hasCompletedTour: boolean;
  finishTour: () => void;
  resetTour: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      hasCompletedTour: false,
      finishTour: () => set({ hasCompletedTour: true }),
      resetTour: () => set({ hasCompletedTour: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOUR || "sw-zstore-tour",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
