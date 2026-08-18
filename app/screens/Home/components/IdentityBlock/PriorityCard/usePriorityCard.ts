import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { fetchPriorityCard, ackPriorityCard } from "../../../../../api/homeCards";
import type {
  HomePriorityCard,
  NextCardPreview,
} from "../../../../../api/homeCards";
import { isKnownIntent } from "./intents";

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
  /** Report a tap or a deliberate skip. Flips `opened` locally straight away. */
  acknowledge: (reason: "tapped" | "skipped") => void;
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

        if (!res?.card || !isKnownIntent(res.card.intent)) {
          setCard(null);
          setQueued(EMPTY);
          return;
        }
        setCard(res.card);
        setQueued(res.queued?.length ? res.queued : EMPTY);
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const acknowledge = useCallback(
    (reason: "tapped" | "skipped") => {
      const current = card;
      if (!current) return;

      // Flip `opened` locally at once. This IS the in-session guard for the
      // "grow on the first tap only" rule: it covers the window between the tap
      // and the next fetch, so pressing twice in one session does not replay the
      // animation. It layers on the server's `opened` rather than competing.
      setCard((prev) => (prev ? { ...prev, opened: true } : prev));

      // A skip retires the card for good, so drop it from the slot immediately
      // rather than leaving it on screen until the next fetch contradicts it.
      if (reason === "skipped") {
        setCard(null);
        setQueued(EMPTY);
      }

      // Fire and forget. Never block navigation on this.
      void ackPriorityCard(current.key, reason);
    },
    [card],
  );

  return { card, queued, acknowledge };
}
