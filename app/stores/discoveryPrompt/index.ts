import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

/**
 * Whether we have already offered to list this person in buddy discovery.
 *
 * THIS STORE HOLDS NO ENTITLEMENT. Whether someone IS discoverable is
 * `user_preferences.discoverable` — the server's answer and only the server's.
 * All this records is that the offer has been made once, which changes how
 * LOUDLY we ask and never whether they appear. Same doctrine as
 * `stores/onboardingNudge` and `stores/firstCall`, deliberately.
 *
 * WHY THE ASK LIVES HERE AND NOT IN ONBOARDING OR ON A TAB SWITCH.
 *
 * Being findable in a stuttering-support app is itself a disclosure, so the
 * consent has to be a decision rather than a reflex — and a reflex is exactly
 * what you get from asking on arrival. That is the mistake the notification
 * permission ask already made and had to be moved away from ("ask at a moment
 * worth spending"): it fired before the person had seen what the app does.
 *
 * The first Community visit is the same shape. A new user there has no buddy,
 * has not seen a timeline, and cannot yet evaluate what being found would lead
 * to. Tapping "Find a buddy" is different in kind: it is the person saying they
 * want to find someone, which is precisely the question consent answers.
 *
 * A TIMESTAMP RATHER THAN A BOOLEAN, matching the nudge store: it costs nothing
 * now and gives a future "offer again after N months" policy somewhere to live
 * without a migration.
 */
interface DiscoveryPromptState {
  /** When the offer was first made. Null means never. */
  offeredAt: number | null;
  /** The offer has now been seen and answered, either way. */
  markOffered: () => void;
}

export const useDiscoveryPromptStore = create<DiscoveryPromptState>()(
  persist(
    (set) => ({
      offeredAt: null,
      // Idempotent: the timestamp records the FIRST offer, and a later screen
      // must not move it and make the ask look recent.
      markOffered: () =>
        set((s) => (s.offeredAt ? s : { offeredAt: Date.now() })),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_DISCOVERY_PROMPT,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Should the full first-run offer be shown, rather than the quiet row?
 *
 * Both arguments come from the SERVER's profile, never from this store — being
 * already listed ends the question regardless of what we have recorded here.
 */
export function shouldOfferDiscovery(
  discoverable: boolean,
  offeredAt: number | null,
): boolean {
  if (discoverable) return false;
  return offeredAt === null;
}
