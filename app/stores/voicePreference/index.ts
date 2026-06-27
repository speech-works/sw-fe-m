import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import type { VoicePreference } from "../../util/voice/types";

/**
 * App-wide reading-guide voice/accent preference for the Voice Hover tool.
 *
 * This is a single source of truth: the user picks an accent once (from the
 * in-tool AccentPicker on ANY practice screen, or from Settings) and it applies
 * everywhere the guide voice speaks, persisting across launches. Unlike the
 * per-screen rate/pre-pause/gap (which are session tweaks), the accent is global.
 *
 * Saved-on-selection: setPreference is called the moment a voice is chosen, so
 * there is no explicit "save" step. We persist accent + voice name (not only the
 * identifier) so the voice can be re-resolved if an OS update changes identifiers.
 *
 * Local-only (offline-first). Phase 1 adds no backend; a future phase can sync
 * this through the existing userPreference API.
 */
interface VoicePreferenceState {
  preference: VoicePreference | null;
  setPreference: (preference: VoicePreference) => void;
  clearPreference: () => void;
  /** Wipe on logout (mirrors other user-scoped stores). */
  reset: () => void;
}

export const useVoicePreferenceStore = create<VoicePreferenceState>()(
  persist(
    (set) => ({
      preference: null,
      setPreference: (preference) => set({ preference }),
      clearPreference: () => set({ preference: null }),
      reset: () => set({ preference: null }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_VOICE_PREFERENCE,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
