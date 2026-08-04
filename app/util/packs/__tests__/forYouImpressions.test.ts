import {
  cardVisibility,
  createSlideImpressionTracker,
  type ShelfGeometry,
} from "../forYouImpressions";

/** The real numbers: heading 24 + rowGap 12 + badge overhang 6; card 254; CTA
 *  ends 24pt (the card's bottom padding) above the card's bottom edge. */
const GEO: ShelfGeometry = {
  cardTopInSection: 42,
  cardHeight: 254,
  ctaBottomFromCardTop: 230,
};

describe("cardVisibility", () => {
  it("reports the card, not the section around it", () => {
    // Section top 100 → card spans 142–396, entirely inside the band.
    const v = cardVisibility(
      { top: 100, visibleTop: 0, visibleBottom: 700 },
      GEO,
    );
    expect(v.cardVisiblePct).toBe(100);
    expect(v.ctaVisible).toBe(true);
  });

  it("does not count the band the dock covers", () => {
    // Card spans 142–396; the dock starts at 300, so 158 of 254 is visible.
    const v = cardVisibility(
      { top: 100, visibleTop: 0, visibleBottom: 300 },
      GEO,
    );
    expect(v.cardVisiblePct).toBe(62);
  });

  it("calls the CTA hidden when only the top of the card cleared the dock", () => {
    // THE COLD-OPEN CASE. Most of the card is on screen and every word that
    // sells is not — the distinction this whole event exists to make.
    const v = cardVisibility(
      { top: 553, visibleTop: 0, visibleBottom: 752 },
      GEO,
    );
    expect(v.cardVisiblePct).toBe(62);
    expect(v.ctaVisible).toBe(false);
  });

  it("clamps a card scrolled off the top rather than reporting negatives", () => {
    const v = cardVisibility(
      { top: -400, visibleTop: 0, visibleBottom: 700 },
      GEO,
    );
    expect(v.cardVisiblePct).toBe(0);
  });

  it("never exceeds 100 when the band is taller than the card", () => {
    const v = cardVisibility(
      { top: 0, visibleTop: 0, visibleBottom: 5000 },
      GEO,
    );
    expect(v.cardVisiblePct).toBe(100);
  });
});

describe("createSlideImpressionTracker", () => {
  const DWELL = 600;
  const KEYS = ["alpha", "beta", "gamma"];
  let emit: jest.Mock;

  const make = () =>
    createSlideImpressionTracker({
      dwellMs: DWELL,
      keyFor: (i) => KEYS[i] ?? null,
      emit,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    emit = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("records slide 0 on seed — the carousel never reports it", () => {
    const t = make();
    t.seed();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(0, "initial", 0);
  });

  it("ignores swipes until the shelf itself is visible", () => {
    const t = make();
    t.settleAt(1);
    jest.advanceTimersByTime(DWELL);
    expect(emit).not.toHaveBeenCalled();
  });

  it("counts a slide only once it has been dwelt on", () => {
    const t = make();
    t.seed();
    emit.mockClear();

    t.settleAt(1);
    jest.advanceTimersByTime(DWELL - 1);
    expect(emit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(emit).toHaveBeenCalledWith(1, "swipe", DWELL);
  });

  it("skips slides a flick passed through", () => {
    const t = make();
    t.seed();
    emit.mockClear();

    // 0 → 1 → 2 inside one fling: index 1 is reported by the carousel but was
    // on screen for a few frames.
    t.settleAt(1);
    jest.advanceTimersByTime(100);
    t.settleAt(2);
    jest.advanceTimersByTime(DWELL);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(2, "swipe", DWELL);
  });

  it("does not re-count a slide swiped back to", () => {
    const t = make();
    t.seed();
    emit.mockClear();

    t.settleAt(1);
    jest.advanceTimersByTime(DWELL);
    t.settleAt(0);
    jest.advanceTimersByTime(DWELL);
    t.settleAt(1);
    jest.advanceTimersByTime(DWELL);

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("does not re-seed slide 0 if the shelf re-qualifies without a reset", () => {
    const t = make();
    t.seed();
    t.seed();
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("counts everything again after a reset — a return visit is a new view", () => {
    const t = make();
    t.seed();
    t.settleAt(1);
    jest.advanceTimersByTime(DWELL);
    expect(emit).toHaveBeenCalledTimes(2);

    t.reset();
    t.seed();
    t.settleAt(1);
    jest.advanceTimersByTime(DWELL);
    expect(emit).toHaveBeenCalledTimes(4);
  });

  it("drops a pending dwell on reset rather than firing after the screen is gone", () => {
    const t = make();
    t.seed();
    emit.mockClear();

    t.settleAt(1);
    t.reset();
    jest.advanceTimersByTime(DWELL * 2);
    expect(emit).not.toHaveBeenCalled();
  });

  it("ignores an index with no slide behind it", () => {
    const t = make();
    t.seed();
    emit.mockClear();

    t.settleAt(99);
    jest.advanceTimersByTime(DWELL);
    expect(emit).not.toHaveBeenCalled();
  });
});
