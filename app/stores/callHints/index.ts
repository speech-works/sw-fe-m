import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

/**
 * WHAT THE USER HAS FOUND ON THE CALL SCREEN.
 *
 * "Take your time" — the hourglass in the call dock — turns off the silence
 * timer, so a block or a pause never ends your turn. For an app whose users
 * block mid-sentence that is the most important control on the screen, and an
 * hourglass communicates none of it.
 *
 * Rather than put words on a screen we deliberately keep bare, the icon
 * breathes until it has been pressed once — ever — and the status line that is
 * already there says what the press did. This flag is what stops the pulse
 * from coming back afterwards.
 *
 * Teaching state ONLY. It gates a hint and nothing else: losing it costs a
 * user one extra pulse, never an entitlement. Cleared on logout so the next
 * person on a shared device gets taught too.
 */
interface CallHintsState {
  /** True once the take-your-time toggle has been pressed at least once. */
  takeYourTimeTried: boolean;
  markTakeYourTimeTried: () => void;
  reset: () => void;
}

export const useCallHintsStore = create<CallHintsState>()(
  persist(
    (set) => ({
      takeYourTimeTried: false,
      markTakeYourTimeTried: () => set({ takeYourTimeTried: true }),
      reset: () => set({ takeYourTimeTried: false }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_CALL_HINTS,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
