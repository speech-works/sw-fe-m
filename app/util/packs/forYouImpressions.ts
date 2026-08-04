/**
 * The bookkeeping behind "who actually saw the programs shelf".
 *
 * Lives here rather than inside `ForYouCarousel` because it is decision logic
 * about money, and all three rules in it are ones the component got wrong for
 * free before anybody noticed:
 *
 *   · a card counted as shown while its price sat under the tab dock,
 *   · the first slide — the only one with a badge — emitted no impression at
 *     all, because the carousel reports index CHANGES and starts at 0,
 *   · a flick from slide 1 to slide 3 counted slide 2, which nobody read.
 *
 * Pure and timer-driven, with the geometry passed in rather than imported, so
 * it can be tested without rendering a React Native tree (see the note at the
 * top of jest.config.js on why that matters here).
 */

/** Where the card sits inside the section, and where its action ends. */
export interface ShelfGeometry {
  /** Section top edge → card top edge. */
  cardTopInSection: number;
  /** The card's own height. */
  cardHeight: number;
  /** Card top edge → the bottom of the CTA island. */
  ctaBottomFromCardTop: number;
}

/** The measured section, in window space. */
export interface ShelfRect {
  /** Window-space top edge of the section. */
  top: number;
  /** Window-space top of the viewport. */
  visibleTop: number;
  /** Window-space y below which the dock covers everything. */
  visibleBottom: number;
}

export interface CardVisibility {
  /** How much of the CARD (not the section) a person could actually see, 0–100. */
  cardVisiblePct: number;
  /** Whether the price/CTA band cleared the dock. The fold question, as a boolean. */
  ctaVisible: boolean;
}

/**
 * Translate a rect for the whole section into facts about the card inside it.
 * The section includes a heading, paging dots and a "show more" link, none of
 * which sell anything — reporting on the section would flatter every number.
 */
export function cardVisibility(rect: ShelfRect, geo: ShelfGeometry): CardVisibility {
  const cardTop = rect.top + geo.cardTopInSection;
  const shownTop = Math.max(cardTop, rect.visibleTop);
  const shownBottom = Math.min(cardTop + geo.cardHeight, rect.visibleBottom);
  const shown = Math.max(0, shownBottom - shownTop);

  return {
    cardVisiblePct:
      geo.cardHeight > 0
        ? Math.round(Math.min(1, shown / geo.cardHeight) * 100)
        : 0,
    ctaVisible: cardTop + geo.ctaBottomFromCardTop <= rect.visibleBottom,
  };
}

export type SlideTrigger = "initial" | "swipe";

export interface SlideImpressionOptions {
  /** How long a slide must stay settled before it counts. */
  dwellMs: number;
  /** Dedup key for the slide at `index`, or null when there is no such slide. */
  keyFor: (index: number) => string | null;
  emit: (index: number, trigger: SlideTrigger, dwellMs: number) => void;
}

export interface SlideImpressionTracker {
  /**
   * The shelf itself became visible. Arms the tracker and records slide 0,
   * which is the only way that slide is ever counted.
   */
  seed: () => void;
  /** The carousel settled on `index`. Counted only if it stays there. */
  settleAt: (index: number) => void;
  /** New visit: forget everything, including that the shelf was ever seen. */
  reset: () => void;
}

export function createSlideImpressionTracker(
  opts: SlideImpressionOptions,
): SlideImpressionTracker {
  const seen = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Until the shelf itself qualifies, swipes are happening somewhere the person
  // cannot see — counting them would rebuild the exact dishonesty we removed.
  let armed = false;

  const record = (index: number, trigger: SlideTrigger, dwellMs: number) => {
    const key = opts.keyFor(index);
    if (key === null || seen.has(key)) return;
    seen.add(key);
    opts.emit(index, trigger, dwellMs);
  };

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    seed() {
      if (armed) return;
      armed = true;
      record(0, "initial", 0);
    },
    settleAt(index: number) {
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (!armed) return;
        record(index, "swipe", opts.dwellMs);
      }, opts.dwellMs);
    },
    reset() {
      clear();
      seen.clear();
      armed = false;
    },
  };
}
