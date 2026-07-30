import {
  isOnboardingQuieted,
  useOnboardingNudgeStore,
} from "../onboardingNudge";

/**
 * A skip has to OUTLIVE THE PROCESS.
 *
 * It used to be React state inside MainNavigator, so every cold start re-forced
 * the thirteen-question flow over the whole app for anyone unfinished — after
 * they had already declined, and from a screen with no close button. In an app
 * whose users are anxiety-sensitive, that is the single most punishing thing
 * the navigator could do.
 */
describe("onboarding nudge", () => {
  beforeEach(() => useOnboardingNudgeStore.getState().clearSkip());

  it("is loud for someone who has never asked to be left alone", () => {
    expect(isOnboardingQuieted(useOnboardingNudgeStore.getState())).toBe(false);
  });

  it("goes quiet the moment they skip", () => {
    useOnboardingNudgeStore.getState().markSkipped();
    expect(isOnboardingQuieted(useOnboardingNudgeStore.getState())).toBe(true);
  });

  it("STAYS quiet — a skip is not a per-session truce", () => {
    // The whole point. A fresh read of the persisted value, as a cold start
    // would do, must still be quiet.
    useOnboardingNudgeStore.getState().markSkipped();
    const persisted = { skippedAt: useOnboardingNudgeStore.getState().skippedAt };
    expect(isOnboardingQuieted(persisted)).toBe(true);
  });

  it("becomes loud again once they finish, so a later re-ask can reach them", () => {
    useOnboardingNudgeStore.getState().markSkipped();
    useOnboardingNudgeStore.getState().clearSkip();
    expect(isOnboardingQuieted(useOnboardingNudgeStore.getState())).toBe(false);
  });

  it("records a timestamp, not a bare flag", () => {
    // Nothing expires today, but a "remind me in a week" policy has to have
    // somewhere to live that does not need a storage migration.
    const before = Date.now();
    useOnboardingNudgeStore.getState().markSkipped();
    const at = useOnboardingNudgeStore.getState().skippedAt;
    expect(typeof at).toBe("number");
    expect(at as number).toBeGreaterThanOrEqual(before);
  });

  it("HOLDS NO ENTITLEMENT — it can never claim onboarding is finished", () => {
    // The structural invariant. Whether onboarding is complete is
    // `user.hasCompletedOnboarding`, the server's answer. This store decides
    // volume only, so quieting must never remove the card or the questions.
    useOnboardingNudgeStore.getState().markSkipped();
    const state = useOnboardingNudgeStore.getState() as unknown as Record<string, unknown>;

    expect(Object.keys(state)).not.toContain("hasCompletedOnboarding");
    expect(Object.keys(state)).not.toContain("isComplete");
    expect(Object.keys(state)).not.toContain("completed");
  });
});
