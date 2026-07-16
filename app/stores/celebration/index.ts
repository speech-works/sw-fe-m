import { create } from "zustand";
import { useUserStore } from "../user";

/**
 * Completion-celebration snapshot store.
 *
 * XP is awarded server-side as a side effect of the /complete endpoints, so the
 * only way the client can show "+N growth" is to snapshot the user's totals
 * BEFORE the POST and diff against a fresh /users/me afterwards. Callers
 * fire-and-forget `fetchUser()` right after completing, so the snapshot must
 * predate the POST — it is captured inside the two API chokepoints
 * (completePracticeActivity / completeMirrorWorkActivity), covering every
 * practice flow with zero per-caller wiring.
 *
 * Deliberately NOT persisted: a snapshot must never survive an app restart.
 */
export interface CelebrationSnapshot {
  totalXp: number;
  level: number;
  capturedAt: number;
}

interface CelebrationState {
  snapshot: CelebrationSnapshot | null;
  /** Snapshot the current user's totals. No-op (null) when no user is loaded. */
  capture: () => void;
  /** Return the snapshot AND clear it — consume-once so a re-mounted success
   *  screen can never re-celebrate the same completion. */
  consume: () => CelebrationSnapshot | null;
  clear: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  snapshot: null,

  capture: () => {
    const user = useUserStore.getState().user;
    if (!user || user.totalXp === undefined) {
      set({ snapshot: null });
      return;
    }
    set({
      snapshot: {
        totalXp: user.totalXp ?? 0,
        level: user.level ?? 1,
        capturedAt: Date.now(),
      },
    });
  },

  consume: () => {
    const snap = get().snapshot;
    set({ snapshot: null });
    return snap;
  },

  clear: () => set({ snapshot: null }),
}));
