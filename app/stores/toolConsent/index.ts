import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { ToolType } from "../../api/tools/types";

/**
 * Persists which fluency tools the user has seen the one-time educational
 * consent modal for. The modal is shown the first time a monitored tool
 * (DAF / Chorus) is activated, then never again. Local-only gate (AsyncStorage)
 * — analytics funnel is tracked separately via PostHog.
 */
interface ToolConsentState {
  /** Map of ToolType -> true once the user has acknowledged its consent modal. */
  consented: Partial<Record<ToolType, boolean>>;
  hasConsented: (tool: ToolType) => boolean;
  markConsented: (tool: ToolType) => void;
}

export const useToolConsentStore = create<ToolConsentState>()(
  persist(
    (set, get) => ({
      consented: {},
      hasConsented: (tool) => !!get().consented[tool],
      markConsented: (tool) =>
        set((state) => ({
          consented: { ...state.consented, [tool]: true },
        })),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOOL_CONSENT,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
