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

/**
 * Which growth axes the completion just moved, as the SERVER resolved them.
 *
 * Kept apart from `snapshot` above on purpose, because the two have opposite
 * timing and mixing them would break that one's invariant. The snapshot is
 * taken BEFORE the POST (it has to be — XP is awarded server-side and the diff
 * is the whole point); this arrives IN the response.
 *
 * Why carry it at all rather than work it out here: the axes depend on the
 * practice SUB-type — a phone call and a technique drill are both
 * EXPOSURE_PRACTICE and move entirely different things — and the registry that
 * knows this lives on the server. A second copy in the app would drift from it
 * silently and be wrong about somebody's growth, which is the reason the daily
 * plan sends `closed` rather than letting the client re-derive it.
 *
 * Bound to an activity id for the same reason the snapshot is: a success screen
 * must never describe a different completion.
 */
export interface EarnedAxes {
  activityId: string;
  /** Enum values (STEADIER, not "Finisher"). Filter through VISIBLE_AXES. */
  axes: string[];
}

interface CelebrationState {
  snapshot: CelebrationSnapshot | null;
  earned: EarnedAxes | null;
  /** Snapshot the current user's totals, bound to the completing activity.
   *  No-op (null) when no user is loaded. */
  capture: (activityId?: string | null) => void;
  /** Return the snapshot AND clear it — consume-once so a re-mounted success
   *  screen can never re-celebrate the same completion. */
  consume: () => CelebrationSnapshot | null;
  clear: () => void;
  /** Record what the server said this completion moved. Post-response. */
  recordEarned: (activityId: string | null, axes?: string[] | null) => void;
  /**
   * Read the axes for a SPECIFIC completion. Not consume-once, unlike the
   * snapshot: this only renders a line of text, so a re-render must be able to
   * read it again, and the id match is what stops it describing the wrong
   * activity.
   *
   * SAFE TO CALL FROM A SELECTOR — see NO_AXES. Both branches return a
   * referentially stable array.
   */
  earnedFor: (activityId?: string | null) => readonly string[];
}

/**
 * THE EMPTY RESULT IS A SINGLETON, AND THAT IS LOAD-BEARING — not a
 * micro-optimisation.
 *
 * `earnedFor` is read through a zustand selector on the success screen
 * (`useCelebrationStore((s) => s.earnedFor(activityId))`). zustand v5 dropped
 * the `useSyncExternalStoreWithSelector` equality shim and hands the selector
 * straight to React's `useSyncExternalStore`, which compares snapshots with
 * `Object.is`. A fresh `[]` per call is therefore a snapshot that NEVER
 * compares equal: React force-re-renders after every commit, loops, and throws
 * "Maximum update depth exceeded" — a render-phase error, so it escapes to the
 * root error boundary and the user gets the "Something went wrong" screen
 * instead of their completion.
 *
 * It only bit on the miss path (`earned.axes` on the hit path is already the
 * one array the response was stored with), which made it look intermittent: it
 * fired exactly when a completion moved no axis, when the server omitted
 * `axesMoved`, or when the caller passed no activity id (Mirror Work).
 *
 * Frozen so a caller cannot mutate the shared instance.
 */
const NO_AXES: readonly string[] = Object.freeze([]);

export const useCelebrationStore = create<CelebrationState>((set, get) => ({
  snapshot: null,
  earned: null,

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

  clear: () => set({ snapshot: null, earned: null }),

  recordEarned: (activityId, axes) => {
    // Always overwrite — including with nothing. A completion that moved no
    // axis (the RANDOM_QUESTIONS warm-up, say) must CLEAR the previous one, or
    // the success screen would name an axis earned by an earlier activity.
    set({
      earned:
        activityId && axes && axes.length > 0 ? { activityId, axes } : null,
    });
  },

  earnedFor: (activityId) => {
    const earned = get().earned;
    if (!earned || !activityId || earned.activityId !== activityId)
      return NO_AXES;
    return earned.axes;
  },
}));
