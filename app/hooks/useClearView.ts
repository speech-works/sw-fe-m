import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { useNativeModalStore } from "../stores/nativeModal";
import { useSystemDialogStore } from "../stores/systemDialog";

/**
 * "Is the user actually looking at this screen, unobstructed, right now — and
 * have they been for long enough that it is safe to spend something on it?"
 *
 * FOR ONE-SHOT MOMENTS THAT CANNOT BE REPLAYED. An animation that fires behind
 * a bottom sheet is not merely unseen; if the thing that fired it is a
 * once-ever budget, it is spent. Every condition here exists because it has a
 * way of quietly eating one of those.
 *
 * CURRENTLY UNUSED. Its only caller was the top-match stamp, which was deleted
 * along with the badge it announced. Kept because the conditions below were
 * each learned from a real way of losing a one-shot moment, and the app has
 * other one-shots (the level-up takeover, the first call) that would otherwise
 * have to rediscover them. If nothing adopts it, delete it — do not let it rot
 * into a hook nobody dares remove.
 *
 *   focused      — a sheet can send someone off Home without ever dismissing:
 *                  report a mood and you land in the Academy, and the route
 *                  changed while nothing "closed".
 *   foregrounded — Reanimated does not run in the background, so a slam started
 *                  a moment before a phone call returns having played to nobody.
 *   no modal     — every sheet and dialog we draw registers in `nativeModal`.
 *   no OS dialog — and the ones we do not draw register in `systemDialog`.
 *
 * THE QUIET PERIOD IS THE ONE THAT IS EASY TO MISS. Home's proactive moments
 * arrive on timers AFTER it settles — the mood check at 500ms, the notification
 * ask at 1000ms — so "is anything covering me?" asked at mount is answered
 * "no", truthfully, by a screen that is about to be covered. Requiring the view
 * to be clear CONTINUOUSLY for `quietMs` waits those out. It also absorbs
 * sheet-to-sheet hand-offs, where the registry momentarily empties between a
 * sheet closing and its successor opening — a gap long enough to trigger on and
 * far too short to see.
 *
 * Callers must treat this as live, not as a one-time check: it goes false the
 * instant something appears, which is the signal to ABORT in flight and, above
 * all, not to record the moment as spent.
 */

/**
 * Longer than every other proactive moment on Home (mood check 500ms,
 * notification ask 1000ms) — on purpose, and it is a product decision, not a
 * safety margin. Those are the therapy business and a real permission; a stamp
 * animation on the card that sells is the least important thing competing for
 * that moment, so it goes last and takes what is left.
 */
export const CLEAR_VIEW_QUIET_MS = 1400;

export function useClearView(quietMs: number = CLEAR_VIEW_QUIET_MS): boolean {
  const isFocused = useIsFocused();
  // Booleans, never the arrays/objects themselves: zustand v5 dropped the
  // equality shim, so a selector returning a fresh reference re-renders every
  // store write and can loop.
  const modalOpen = useNativeModalStore((s) => s.openIds.length > 0);
  const systemDialogOpen = useSystemDialogStore((s) => s.depth > 0);

  const [appActive, setAppActive] = useState(
    () => AppState.currentState === "active",
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) =>
      // Only "active" counts. iOS reports "inactive" for the app switcher and
      // while a system alert is up, which is exactly when we must not play.
      setAppActive(next === "active"),
    );
    return () => sub.remove();
  }, []);

  const clear = isFocused && appActive && !modalOpen && !systemDialogOpen;

  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!clear) {
      // Drops synchronously so an in-flight caller aborts on the same tick the
      // obstruction appears, rather than `quietMs` later.
      setSettled(false);
      return undefined;
    }
    const timer = setTimeout(() => setSettled(true), quietMs);
    return () => clearTimeout(timer);
  }, [clear, quietMs]);

  return clear && settled;
}
