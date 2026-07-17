import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import {
  AvatarManifest,
  AvatarSlot,
  normalizeManifest,
} from "../../types/avatar";

/**
 * The Avatar Studio's work-in-progress. Persisted so an app kill mid-edit
 * resumes where the user left off (their labor is the point — never lose it);
 * cleared only on a successful save. The saved avatar itself lives on the
 * User (`avatarManifest`), not here.
 */
interface AvatarDraftState {
  /** The manifest being edited; null = no session in progress. */
  draft: AvatarManifest | null;
  /** JSON snapshot of the manifest at editor-open — the dirty baseline. */
  beganFrom: string | null;

  /** Open the editor over the user's saved manifest (or the default). A dirty
   *  persisted draft wins — that's the resume-after-kill path. */
  loadFromUser: (saved: AvatarManifest | null | undefined) => void;
  setPart: (slot: AvatarSlot, id: string | null) => void;
  setColor: (key: keyof AvatarManifest["colors"], hex: string) => void;
  isDirty: () => boolean;
  /** Discard edits back to the open snapshot. */
  reset: () => void;
  /** After a successful save — the User now carries the truth. */
  clear: () => void;
}

export const useAvatarDraftStore = create<AvatarDraftState>()(
  persist(
    (set, get) => ({
      draft: null,
      beganFrom: null,

      loadFromUser: (saved) => {
        const { draft, beganFrom } = get();
        // Resume a dirty in-flight edit rather than clobbering the user's work.
        if (draft && beganFrom && JSON.stringify(draft) !== beganFrom) return;
        const base = normalizeManifest(saved);
        set({ draft: base, beganFrom: JSON.stringify(base) });
      },

      setPart: (slot, id) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: { ...draft, parts: { ...draft.parts, [slot]: id } } });
      },

      setColor: (key, hex) => {
        const { draft } = get();
        if (!draft) return;
        set({ draft: { ...draft, colors: { ...draft.colors, [key]: hex } } });
      },

      isDirty: () => {
        const { draft, beganFrom } = get();
        return !!draft && !!beganFrom && JSON.stringify(draft) !== beganFrom;
      },

      reset: () => {
        const { beganFrom } = get();
        if (!beganFrom) return;
        set({ draft: JSON.parse(beganFrom) });
      },

      clear: () => set({ draft: null, beganFrom: null }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_AVATAR_DRAFT,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Defend against a stale persisted shape from an older manifest version.
        if (state?.draft) {
          state.draft = normalizeManifest(state.draft);
        }
      },
    },
  ),
);
