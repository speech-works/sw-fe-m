import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

/**
 * How loudly Home should offer the first call — and nothing else.
 *
 * THIS STORE HOLDS NO ENTITLEMENT. Whether the call is still available is the
 * server's answer (`GET /first-call`) and only the server's; putting that on
 * the device would mean a reinstall hands out a second free call, or a cleared
 * cache silently takes somebody's away. All this remembers is that they said
 * "not now", so we stop putting it in front of them like it is new.
 *
 * NOTHING HERE EVER REMOVES THE OFFER. Quieting only decides between the hero
 * card and a single quiet row; the call stays one tap away in both.
 */
interface FirstCallState {
  /** When they last put it off, or null if they never have. */
  deferredAt: number | null;
  /** They told us they have no headphones — a fact, not a mood. */
  noHeadphones: boolean;
  /** "Remind me later" — quiet for a few days, then offer it properly again. */
  defer: () => void;
  /** "I don't have headphones" — stop asking until they say otherwise. */
  markNoHeadphones: () => void;
  /** They came back through the quiet row: treat it as new again. */
  clearDeferral: () => void;
}

/** How long a "remind me later" quiets the offer for. */
export const FIRST_CALL_DEFER_MS = 3 * 24 * 60 * 60 * 1000;

export const useFirstCallStore = create<FirstCallState>()(
  persist(
    (set) => ({
      deferredAt: null,
      noHeadphones: false,
      defer: () => set({ deferredAt: Date.now() }),
      markNoHeadphones: () => set({ noHeadphones: true, deferredAt: Date.now() }),
      clearDeferral: () => set({ deferredAt: null, noHeadphones: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_FIRST_CALL,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * True while the offer should sit in a quiet row rather than the hero card.
 *
 * "Remind me later" wears off; "I have no headphones" does not, because
 * re-asking somebody every three days for hardware they do not own is nagging,
 * not a reminder. Either way the row is still there.
 */
export function isFirstCallQuieted(state: {
  deferredAt: number | null;
  noHeadphones: boolean;
}): boolean {
  if (state.noHeadphones) return true;
  if (!state.deferredAt) return false;
  return Date.now() - state.deferredAt < FIRST_CALL_DEFER_MS;
}
