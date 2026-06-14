import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Device-level analytics preference. Default ON; the user can opt out in
 * Settings → Preferences. This is intentionally NOT one of the `SW_ZSTORE_*`
 * keys cleared on logout — it's the person's privacy choice for this device and
 * must survive sign-out. Disclosed in the privacy policy.
 */
interface AnalyticsConsentState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useAnalyticsConsentStore = create<AnalyticsConsentState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "SW_ANALYTICS_CONSENT",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
