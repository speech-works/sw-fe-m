import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { fetchPriorityCard, ackPriorityCard } from "../../../../../api/homeCards";
import type {
  HomePriorityCard,
  NextCardPreview,
} from "../../../../../api/homeCards";
import { isKnownIntent, SHEET_INTENT } from "./intents";

/** Matches SmartRecommendationCard: a card is not worth re-fetching every focus. */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * One shared empty array, never a fresh `[]`.
 *
 * zustand v5 dropped its equality shim, and the same mistake here is just as
 * expensive: a new array identity on every "nothing queued" response re-renders
 * the whole identity row for no change. There is only one empty queue.
 */
const EMPTY: NextCardPreview[] = [];

export interface PriorityCardHook {
  /** Null means render the Level card. Covers loading, offline, and "nothing to say". */
  card: HomePriorityCard | null;
  /**
   * The cards queued behind this one. This is what the folder draws as pages,
   * and it is the ONLY reason it is on the wire: each carries no key and no
   * intent, so it can be read but never opened.
   */
  queued: NextCardPreview[];
  /**
   * Report what happened to the card. A tap flips `opened` locally straight
   * away; a skip or a snooze also takes it off the slot at once rather than
   * leaving it there until a later fetch contradicts it.
   *
   * `actionId` is sent only for a snooze, so the server can find that choice on
   * the stored card and read how many days it asks for.
   */
  acknowledge: (
    reason: "tapped" | "skipped" | "snoozed",
    actionId?: string,
  ) => void;
}

/**
 * The Home priority slot's data.
 *
 * Returns null until it can answer, and stays null if it cannot — following
 * useCallAllowance. There is deliberately NO loading state and NO error state
 * exposed: the caller's fallback for all three is the same Level card, so
 * handing it three ways to say "nothing" would only invite three code paths
 * that do the same thing.
 *
 * ── THE THROTTLE BUG THIS DELIBERATELY AVOIDS ───────────────────────────────
 * The focus guard reads ONLY `lastFetchRef`, never a state value. The same hook
 * shape in SmartRecommendationCard once had `&& !loading` in this condition,
 * which made the throttle DEAD CODE: the fetcher is `useCallback(..., [])`, so
 * the callback captured `loading` at its initial `true` forever and the guard
 * never returned early. That cost two API calls on every return to Home, and a
 * single flaky request would replace a perfectly good card with an error one.
 * Here the same mistake would replace a live card with the Level card on a bad
 * network, which looks like the feature randomly turning itself off.
 */
/**
 * The card this build can actually honour, or null.
 *
 * ── WHY THE CHOICES ARE CHECKED TOO, AND NOT JUST THE CARD ──────────────────
 * The card's own intent has always been checked, which is what makes publishing
 * a card with a new destination safe on older installs: they hide it rather
 * than showing something that does nothing. The CHOICES inside a sheet were
 * not, so an old build would happily draw a sheet with a button that warned in
 * dev and silently did nothing in production. That is the same dead tap the
 * intent map exists to prevent, one level down.
 *
 * A sheet needs two choices to be a choice, so a card left with fewer than two
 * reachable ones is dropped entirely rather than shown with one button. The
 * next card in the queue takes its place, which is what happens with any other
 * card this build cannot reach.
 */
const reachable = (card: HomePriorityCard): HomePriorityCard | null => {
  if (!isKnownIntent(card.intent)) return null;
  if (card.intent !== SHEET_INTENT) return card;

  const actions = card.actions.filter((a) => isKnownIntent(a.intent));
  if (actions.length < 2) return null;
  return actions.length === card.actions.length ? card : { ...card, actions };
};

export function usePriorityCard(): PriorityCardHook {
  const [card, setCard] = useState<HomePriorityCard | null>(null);
  const [queued, setQueued] = useState<NextCardPreview[]>([]);
  const lastFetchRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      // `lastFetchRef` starts at 0, so the first focus always fetches.
      if (Date.now() - lastFetchRef.current < STALE_THRESHOLD_MS) return;

      let cancelled = false;
      void (async () => {
        const res = await fetchPriorityCard();
        if (cancelled) return;
        lastFetchRef.current = Date.now();

        const usable = res?.card ? reachable(res.card) : null;
        if (!usable) {
          setCard(null);
          setQueued(EMPTY);
          return;
        }
        setCard(usable);
        setQueued(res?.queued?.length ? res.queued : EMPTY);
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const acknowledge = useCallback(
    (reason: "tapped" | "skipped" | "snoozed", actionId?: string) => {
      const current = card;
      if (!current) return;

      // A snooze is not an open, so it must not flip `opened`: that flag drives
      // "grow on the first tap only", and deferring a card is not opening it.
      if (reason !== "snoozed") {
        // Flip `opened` locally at once. This IS the in-session guard for the
        // "grow on the first tap only" rule: it covers the window between the
        // tap and the next fetch, so pressing twice in one session does not
        // replay the animation. It layers on the server's `opened` rather than
        // competing.
        setCard((prev) => (prev ? { ...prev, opened: true } : prev));
      }

      // Both of these take the card off the slot now rather than leaving it on
      // screen until a later fetch contradicts it. A skip retires it for good;
      // a snooze hides it for the days the console chose.
      if (reason === "skipped" || reason === "snoozed") {
        setCard(null);
        setQueued(EMPTY);
      }

      // Fire and forget. Never block navigation on this.
      void ackPriorityCard(current.key, reason, actionId);
    },
    [card],
  );

  return { card, queued, acknowledge };
}
