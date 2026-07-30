import {
  useOnboardingNudgeStore,
  completedOnboardingToday,
} from "../onboardingNudge";

/**
 * ============================================================================
 * ONE INTRODUCTION, AND ONE INTERRUPTION PER DAY
 * ----------------------------------------------------------------------------
 * Two policies live on this store and both are about not asking somebody for
 * the same thing twice. Pure functions and plain state, so they can be argued
 * with here rather than by mounting a navigator.
 * ============================================================================
 */

const reset = () =>
  useOnboardingNudgeStore.setState({
    skippedAt: null,
    completedAt: null,
    growthIntroducedAt: null,
  });

describe("the growth introduction", () => {
  beforeEach(reset);

  it("is claimed by whichever surface gets there first, and never repeats", () => {
    // The completion screen and Home's growth row both carry it, because the
    // welcome call reaches Home without passing a completion screen at all.
    // A flag per surface would say the same thing twice to anyone who does
    // both, which is the app explaining itself to somebody who understood it
    // the first time.
    const { markGrowthIntroduced } = useOnboardingNudgeStore.getState();
    expect(useOnboardingNudgeStore.getState().growthIntroducedAt).toBeNull();

    markGrowthIntroduced();
    const first = useOnboardingNudgeStore.getState().growthIntroducedAt;
    expect(first).not.toBeNull();

    // A second surface acknowledging later must not move the timestamp. If it
    // did, the introduction would look recent forever and any future "how long
    // since we explained this" rule would read the wrong date.
    markGrowthIntroduced();
    expect(useOnboardingNudgeStore.getState().growthIntroducedAt).toBe(first);
  });

  it("survives finishing onboarding", () => {
    // `markCompleted` clears the skip, and it would be easy to reset this at
    // the same time — but completing onboarding says nothing about whether the
    // growth words have been explained, and re-introducing them to somebody
    // who already knows is the exact repetition this flag prevents.
    useOnboardingNudgeStore.getState().markGrowthIntroduced();
    const before = useOnboardingNudgeStore.getState().growthIntroducedAt;
    useOnboardingNudgeStore.getState().markCompleted();
    expect(useOnboardingNudgeStore.getState().growthIntroducedAt).toBe(before);
  });
});

describe("completedOnboardingToday", () => {
  it("is false when they have never finished", () => {
    expect(completedOnboardingToday({ completedAt: null })).toBe(false);
  });

  it("is true on the day itself, so nothing else takes the screen", () => {
    // Thirteen questions about what you avoid and how much it distresses you is
    // enough for one day. The mood check reads this and stands down.
    expect(completedOnboardingToday({ completedAt: Date.now() })).toBe(true);
  });

  it("is false the next day, so the mood check comes back on its own", () => {
    // A suppression, not a cancellation — a calendar day, so it ends at a
    // boundary the user would recognise rather than 24 hours after whenever
    // they happened to finish.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(completedOnboardingToday({ completedAt: yesterday.getTime() })).toBe(
      false,
    );
  });

  it("is false for a completion a year ago today", () => {
    // Guards the obvious implementation slip — comparing month and date while
    // forgetting the year.
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(completedOnboardingToday({ completedAt: lastYear.getTime() })).toBe(
      false,
    );
  });
});

describe("markCompleted", () => {
  beforeEach(reset);

  it("also spends the skip, so a finisher is not left quieted", () => {
    useOnboardingNudgeStore.getState().markSkipped();
    expect(useOnboardingNudgeStore.getState().skippedAt).not.toBeNull();

    useOnboardingNudgeStore.getState().markCompleted();
    expect(useOnboardingNudgeStore.getState().skippedAt).toBeNull();
    expect(useOnboardingNudgeStore.getState().completedAt).not.toBeNull();
  });
});
