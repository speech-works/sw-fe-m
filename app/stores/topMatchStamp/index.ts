import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import { getLocalTodayDateString } from "../../util/functions/date";

/**
 * Whether the TOP MATCH stamp has already made its entrance — and for which
 * program.
 *
 * THE ANIMATION IS KEYED TO NOVELTY, NOT TO TIME. The slam is a claim: "we
 * ranked ten of these and this one won." Said once about a pack you have not
 * seen before, that is information. Replayed every app open — or every day —
 * about the same pack, it stops being read at all, and by the time the
 * recommender actually promotes something new there is no signal left to spend.
 * So it fires when the top match CHANGES, and otherwise the card simply renders
 * already-stamped.
 *
 * NOTHING HERE GATES ACCESS. The watermark, the ranking and the price come from
 * the server on every load; this decides only whether a ~1s animation plays. A
 * wiped or corrupt store costs at most one extra slam.
 *
 * WHY IT IS PERSISTED AT ALL. A ref dies with the component and Home remounts
 * its children on every pull-to-refresh, so an in-memory guard means the slam
 * replays several times a session — which is the behaviour this replaces.
 */
interface TopMatchStampState {
  /** Catalog key of the last program whose stamp was actually slammed. */
  lastKey: string | null;
  /** Local date (YYYY-MM-DD) of the last slam — the daily cap. */
  lastDate: string | null;
  /** Lifetime slams, across all programs — the lifetime cap. */
  count: number;
  /** False until AsyncStorage has been read; see `canSlam`. */
  _hasHydrated: boolean;

  /** Records a slam that ACTUALLY FINISHED. Never call this on start. */
  commit: (catalogKey: string) => void;
  reset: () => void;
}

/**
 * After this many slams the device has had its say. Somebody who has seen three
 * and bought nothing is not going to be convinced by a fourth, and the honest
 * move is to stop rather than to shout.
 */
export const STAMP_LIFETIME_MAX = 3;

export const useTopMatchStampStore = create<TopMatchStampState>()(
  persist(
    (set) => ({
      lastKey: null,
      lastDate: null,
      count: 0,
      _hasHydrated: false,

      commit: (catalogKey) =>
        set((state) => ({
          lastKey: catalogKey,
          lastDate: getLocalTodayDateString(),
          count: state.count + 1,
        })),

      reset: () => set({ lastKey: null, lastDate: null, count: 0 }),
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_TOP_MATCH_STAMP,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        lastKey: s.lastKey,
        lastDate: s.lastDate,
        count: s.count,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
    },
  ),
);

/**
 * Whether `catalogKey` has earned a slam.
 *
 * READS FALSE UNTIL HYDRATED, deliberately. The store starts at its defaults
 * (`lastKey: null`, `count: 0`), which is indistinguishable from "brand new
 * user" — so a check that ran before AsyncStorage came back would slam every
 * cold start and then immediately overwrite the record it should have read.
 * This is the same hydration race the mood check already guards; the cost of
 * waiting is a few hundred ms before an animation, and the cost of not waiting
 * is the whole feature.
 */
export function canSlam(
  state: Pick<
    TopMatchStampState,
    "lastKey" | "lastDate" | "count" | "_hasHydrated"
  >,
  catalogKey: string,
): boolean {
  if (!state._hasHydrated) return false;
  // Seen this exact claim before — the card renders stamped, silently.
  if (state.lastKey === catalogKey) return false;
  if (state.count >= STAMP_LIFETIME_MAX) return false;
  // At most one a day even when the recommender changes its mind, so a pack
  // that flip-flops between two candidates cannot turn Home into a slot machine.
  if (state.lastDate === getLocalTodayDateString()) return false;
  return true;
}
