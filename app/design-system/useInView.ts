/**
 * "Is this section actually on screen?" — measured, once per focus.
 *
 * WHY THIS IS NOT A ONE-LINER. Three things make naive answers wrong here:
 *
 * 1. MOUNTED IS NOT VISIBLE. A section can be laid out, fully rendered and
 *    reporting a perfectly good height while sitting several hundred points
 *    below the fold. Anything that treats mount (or a data fetch settling) as an
 *    impression is counting people who never saw it.
 *
 * 2. THE BOTTOM OF THE VIEWPORT IS A LIE. On tab-root screens the floating dock
 *    covers the last ~100pt, and more under Android edge-to-edge. A card whose
 *    call-to-action sits in that band is on screen and invisible at the same
 *    time. `respectOcclusion` (default on) subtracts it.
 *
 * 3. THE FIRST MEASUREMENT IS STALE. Home's siblings settle asynchronously and
 *    at different times — a delayed card entrance above this one moves it after
 *    layout has already "finished". So we re-measure on focus and after
 *    interactions, not just on layout.
 *
 * ONE LATCH, ON THE JS THREAD. Two things can qualify a section: it was already
 * visible when the screen settled, or the user scrolled it into view. Those
 * arrive on different threads, so the latch that stops a second report has to
 * live on one of them — JS, since that is where the report runs. The scroll path
 * therefore buckets on the UI thread and hops to JS only every `SCROLL_BUCKET`
 * points, and stops hopping entirely once latched. (Same shape as the px-bucketed
 * handler in `app/components/CustomScrollView.tsx`.)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { runOnJS, useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { usePageScroll } from "./pageScroll";

/** Coarse enough that a full-screen fling costs a handful of hops, fine enough
 *  that we never skip past a section. */
const SCROLL_BUCKET = 40;

/** How the target sat relative to the visible band at the moment it qualified. */
export interface InViewRect {
  /** Fraction of the target inside the unoccluded viewport band, 0–1. */
  visibleFraction: number;
  /** Window-space top edge of the target. */
  top: number;
  /** Target height. */
  height: number;
  /** Window-space y above which nothing is visible (the viewport's top edge). */
  visibleTop: number;
  /** Window-space y below which the dock covers everything. */
  visibleBottom: number;
  /** True when it was already visible on arrival; false when scrolled to. */
  atRest: boolean;
}

export interface UseInViewOptions {
  /** Fraction of the target that must be visible to qualify. Default 0.5. */
  threshold?: number;
  /** Subtract the tab dock's band from the viewport. Default true. */
  respectOcclusion?: boolean;
  /** Fired once per focus, the first time the threshold is met. */
  onEnter?: (rect: InViewRect) => void;
  /** Skip measuring entirely (e.g. the section isn't rendered yet). */
  enabled?: boolean;
}

export function useInView({
  threshold = 0.5,
  respectOcclusion = true,
  onEnter,
  enabled = true,
}: UseInViewOptions = {}) {
  const page = usePageScroll();
  const ref = useRef<View>(null);

  const latched = useRef(false);
  const settled = useRef(false);
  const [hasQualified, setHasQualified] = useState(false);

  // Latest callback without re-arming anything on every parent render.
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const viewportTop = page?.viewportTop ?? 0;
  const viewportHeight = page?.viewportHeight ?? 0;
  const occluded = respectOcclusion ? (page?.occludedBottom ?? 0) : 0;

  // Kept in a ref so the measure callback always reads current geometry without
  // being re-created (and thus re-scheduled) on every layout pass.
  const geo = useRef({ viewportTop, viewportHeight, occluded, threshold });
  geo.current = { viewportTop, viewportHeight, occluded, threshold };

  const measure = useCallback(() => {
    if (!enabled || latched.current) return;
    const node = ref.current;
    if (!node) return;

    node.measureInWindow((_x, y, _w, h) => {
      if (latched.current || h <= 0) return;
      const g = geo.current;
      if (g.viewportHeight <= 0) return;

      // Both rects are in window space, so the live scroll offset is already
      // baked into each — there is nothing to subtract.
      const visibleBottom = g.viewportTop + g.viewportHeight - g.occluded;
      const band = visibleBottom - g.viewportTop;
      const top = Math.max(y, g.viewportTop);
      const bottom = Math.min(y + h, visibleBottom);
      const visibleFraction = Math.max(0, bottom - top) / h;

      // A target taller than the visible band can never reach a high threshold,
      // and would then latch NEVER — silently, looking exactly like "nobody saw
      // it". Ask for the most that is physically showable instead.
      const reachable = band > 0 ? Math.min(g.threshold, (band / h) * 0.9) : g.threshold;
      if (visibleFraction < reachable) return;

      latched.current = true;
      setHasQualified(true);
      onEnterRef.current?.({
        visibleFraction,
        top: y,
        height: h,
        visibleTop: g.viewportTop,
        visibleBottom,
        atRest: !settled.current,
      });
    });
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      // Two passes: one now, one after the screen stops working. The second is
      // the one that catches siblings which finish laying out late.
      measure();
      const task = InteractionManager.runAfterInteractions(() => {
        measure();
        // Everything that was going to move has moved. Anything qualifying from
        // here on is the user's doing, so stop calling it "at rest".
        settled.current = true;
      });
      return () => {
        task.cancel();
        latched.current = false;
        settled.current = false;
        setHasQualified(false);
      };
    }, [measure]),
  );

  // A sibling above us resizing (an async card landing, a skeleton collapsing)
  // moves this section with no scroll event at all, so neither path above would
  // re-evaluate. `measure` is keyed on `enabled`, so this also fires the moment
  // a consumer switches tracking on. Stops as soon as we latch.
  useEffect(() => {
    if (!enabled || hasQualified) return;
    measure();
    const id = setTimeout(measure, 600);
    return () => clearTimeout(id);
  }, [enabled, hasQualified, measure, viewportHeight]);

  const scrollY = page?.scrollY;
  const bucket = useSharedValue(-1);

  useAnimatedReaction(
    () => (scrollY ? Math.round(scrollY.value / SCROLL_BUCKET) : 0),
    (next, prev) => {
      if (next === prev || next === bucket.value) return;
      bucket.value = next;
      runOnJS(measure)();
    },
    [scrollY, measure],
  );

  return { ref, onLayout: measure, hasQualified, measure };
}
