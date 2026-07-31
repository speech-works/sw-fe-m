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
  /**
   * They said yes to the call BEFORE they had an account.
   *
   * The offer is made after Act 1's questions, where there is no session to
   * hold anything server-side — so the answer rides here across signup and the
   * rest of onboarding, and is honoured the first time they reach Home.
   *
   * It is an INTENTION, not an entitlement: it can only ever cause the ringing
   * screen to open, never cause a call to be free or to exist. The server
   * decides that, after they sign in, exactly as it does for everyone else.
   */
  acceptedPreSignup: boolean;
  /** When they last put it off, or null if they never have. */
  deferredAt: number | null;
  /**
   * RETIRED. Set by a "I don't have headphones" control that no longer exists,
   * and read by nothing — isFirstCallQuieted deliberately ignores it, which
   * releases anyone still carrying `true` from a permanent quiet they had no
   * way to undo. Kept on the type so already-persisted JSON still parses.
   */
  noHeadphones: boolean;
  /** "Remind me later" — quiet for a few days, then offer it properly again. */
  defer: () => void;
  /** They came back through the quiet row: treat it as new again. */
  clearDeferral: () => void;
  /** Said yes on the pre-signup screen. */
  acceptPreSignup: () => void;
  /** Honoured (or abandoned) — never fire it twice. */
  clearPreSignup: () => void;
}

/** How long a "remind me later" quiets the offer for. */
export const FIRST_CALL_DEFER_MS = 3 * 24 * 60 * 60 * 1000;

export const useFirstCallStore = create<FirstCallState>()(
  persist(
    (set) => ({
      acceptedPreSignup: false,
      deferredAt: null,
      noHeadphones: false,
      defer: () => set({ deferredAt: Date.now() }),
      clearDeferral: () => set({ deferredAt: null, noHeadphones: false }),
      acceptPreSignup: () => set({ acceptedPreSignup: true }),
      clearPreSignup: () => set({ acceptedPreSignup: false }),
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
 * Only "Remind me later" quiets it now, and it wears off. `noHeadphones` is
 * deliberately not consulted: it could only ever be set by a control that no
 * longer exists, and it had no in-app undo, so honouring it would keep old
 * users permanently shut out of a feature on the strength of one tap.
 */
export function isFirstCallQuieted(state: {
  deferredAt: number | null;
}): boolean {
  if (!state.deferredAt) return false;
  return Date.now() - state.deferredAt < FIRST_CALL_DEFER_MS;
}
