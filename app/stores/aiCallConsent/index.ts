import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

/**
 * One-time consent gate for AI conversation practice. The first time the user
 * opens an AI call — where their microphone audio is streamed in real time to a
 * third-party AI partner for transcription/response — a disclosure modal is
 * shown, then never again. Local-only gate (AsyncStorage); cleared on logout.
 */
interface AICallConsentState {
  consented: boolean;
  markConsented: () => void;
  reset: () => void;
}

export const useAICallConsentStore = create<AICallConsentState>()(
  persist(
    (set) => ({
      consented: false,
      markConsented: () => set({ consented: true }),
      reset: () => set({ consented: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_AI_CALL_CONSENT,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
