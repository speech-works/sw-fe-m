import { create } from "zustand";

interface AppState {
  /** Tracks if the Qonversion SDK has successfully initialized */
  isQonversionReady: boolean;
  setQonversionReady: (isReady: boolean) => void;
}

/**
 * Stores global app state that does NOT need to be persisted,
 * such as the readiness status of SDKs.
 */
export const useAppStore = create<AppState>((set) => ({
  isQonversionReady: false,
  setQonversionReady: (isReady) => set({ isQonversionReady: isReady }),
}));
