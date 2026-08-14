import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { setHapticsEnabled } from "../../design-system/haptics";

/**
 * Device-level vibration preference (Settings → Preferences → Vibration).
 *
 * Like SW_APPEARANCE, this is a preference for THIS PHONE and is deliberately
 * not one of the `SW_ZSTORE_*` keys cleared on logout. Somebody who turned the
 * buzzing off should not have it come back because they signed out.
 *
 * The store is the saved value; `design-system/haptics` holds the live flag
 * every call actually reads. `setEnabled` pushes it straight across so the
 * switch takes effect on the same tap. The startup half of the job belongs to
 * App.tsx, which waits for hydration exactly the way it already does for the
 * analytics consent store.
 */
interface HapticsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHapticsStore = create<HapticsState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => {
        setHapticsEnabled(enabled);
        set({ enabled });
      },
    }),
    {
      name: "SW_HAPTICS",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
