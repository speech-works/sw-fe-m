/**
 * The scroll geometry of the current `Page` body, published so descendants can
 * answer "am I actually on screen right now?".
 *
 * WHY THIS EXISTS. `Page` is the only component that knows all three facts a
 * visibility test needs: where the scroll viewport sits, how far it has been
 * scrolled, and — via `tabBarSafe` + `useNavBarInset()` — how much of its bottom
 * edge the floating dock is covering. Without this, every consumer would
 * re-derive the dock band from a hardcoded constant and get it wrong under
 * Android edge-to-edge, where the dock rides up by the nav bar.
 *
 * `scrollY` is a shared value because it changes every frame and must stay on
 * the UI thread. The rest are plain numbers: they change on layout, not on
 * scroll, so a consumer's `useAnimatedReaction` can capture them via deps
 * without a per-frame bridge hop.
 */
import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

export interface PageScrollState {
  /** Live vertical offset of the Page body. Pinned at 0 for non-scrolling bodies. */
  scrollY: SharedValue<number>;
  /** Window-space top edge of the scroll viewport (0 until measured). */
  viewportTop: number;
  /** Height of the scroll viewport (0 until measured). */
  viewportHeight: number;
  /** Points of the viewport's bottom edge hidden behind the floating tab dock. */
  occludedBottom: number;
}

export const PageScrollContext = createContext<PageScrollState | null>(null);

/**
 * Null outside a `Page` — callers must degrade rather than throw, because plenty
 * of screens (Explore, Community) hand-roll their own ScrollView.
 */
export function usePageScroll(): PageScrollState | null {
  return useContext(PageScrollContext);
}
