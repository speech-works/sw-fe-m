import { useEffect, useState } from "react";
import { useOnboardingDraftStore } from "./index";

/** How long to wait for the Act 1 replay before giving up on it. */
export const REPLAY_WAIT_MS = 6000;

/**
 * TRUE once Act 1's answers are with the server — or once waiting for them has
 * stopped being worth it.
 *
 * Act 1's answers live on the device until signup, and MainNavigator replays
 * them in an effect that races anything asking the server a question those
 * answers decide. Ask too early and the server has no signals to match on, so
 * it falls back to a default — and the pre-signup screen has already promised a
 * name. Being handed Sofia after being told Maya would ring is the one way the
 * first call can quietly break its own promise.
 *
 * `hasPendingReplay()` goes false either when the replay succeeds or when there
 * was nothing to replay, so this settles on both. The ceiling exists because a
 * FAILED replay leaves it pending forever: after that we ask anyway and take
 * the default, which is a worse answer than we meant to give but far better
 * than a spinner that never resolves.
 *
 * Lives here rather than in the screen that first needed it because BOTH first-
 * call entry points have to honour it. The screen's own copy did not cover the
 * one that seeds it from Home, so the wait was skipped on exactly the path that
 * made the promise.
 */
export function useDraftReplaySettled(): boolean {
  const [settled, setSettled] = useState(
    () => !useOnboardingDraftStore.getState().hasPendingReplay(),
  );

  useEffect(() => {
    if (settled) return;
    // `hasPendingReplay` reads the live store rather than the emitted state, so
    // it is called off getState() — the subscription is only the trigger. It
    // flips false the moment `markReplayed` runs, which is immediately after
    // the server acknowledges the answers: exactly the right moment.
    const unsub = useOnboardingDraftStore.subscribe(() => {
      if (!useOnboardingDraftStore.getState().hasPendingReplay()) {
        setSettled(true);
      }
    });
    const ceiling = setTimeout(() => setSettled(true), REPLAY_WAIT_MS);
    return () => {
      unsub();
      clearTimeout(ceiling);
    };
  }, [settled]);

  return settled;
}
