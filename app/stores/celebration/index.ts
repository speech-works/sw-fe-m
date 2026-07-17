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
 *
 * INVARIANT: a snapshot belongs to exactly ONE completion. It is bound to that
 * completion's `activityId`, and the success screen only consumes a snapshot
 * whose id matches the activity it is reporting. Without that binding the
 * correctness of the celebration would rest on tribal knowledge ("DonePractice
 * only ever mounts straight after a completion") — the moment a success screen
 * is reused (a "review last session" view, a retry that skips the API call), an
 * unbound snapshot would fire a WRONG level-up takeover. The id match plus the
 * short staleness window make that structurally impossible.
 * (MirrorWork's success screen has no activityId; it falls back to the
 * staleness window alone — see useCompletionCelebration.)
 */
export interface CelebrationSnapshot {
  totalXp: number;
  level: number;
  capturedAt: number;
  /** The completion this snapshot belongs to. Null only if the chokepoint had
   *  no id to stamp. */
  activityId: string | null;
}

interface CelebrationState {
  snapshot: CelebrationSnapshot | null;
  /** Snapshot the current user's totals, bound to the completing activity.
   *  No-op (null) when no user is loaded. */
  capture: (activityId?: string | null) => void;
  /** Return the snapshot AND clear it — consume-once so a re-mounted success
   *  screen can never re-celebrate the same completion. */
  consume: () => CelebrationSnapshot | null;
  clear: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  snapshot: null,

  capture: (activityId?: string | null) => {
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
        activityId: activityId ?? null,
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
