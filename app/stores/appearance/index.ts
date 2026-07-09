import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Device-level appearance preference (Settings → Preferences → Appearance).
 * "system" follows the OS setting via useColorScheme(); "light"/"dark" pin the
 * scheme. Like SW_ANALYTICS_CONSENT, this is intentionally NOT one of the
 * `SW_ZSTORE_*` keys cleared on logout — it's the person's display choice for
 * this device and must survive sign-out.
 */
export type AppearanceMode = "light" | "dark" | "system";

interface AppearanceState {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "SW_APPEARANCE",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
