import { listingFix, listingFixLabel } from "../listingBlock";

/**
 * The bridge between a server sentence and a button that fixes it.
 *
 * These strings are the contract with `listingBlockedReason` in sw-be-2, and
 * they are matched by substring because the server sends prose rather than a
 * code. That is fragile by nature, which is exactly why it lives in one tested
 * function instead of inline in two screens.
 */
describe("listingFix", () => {
  // Verbatim from sw-be-2 `listingBlockedReason`.
  const ONBOARDING = "Finish setting up your profile before others can find you.";
  const NAME = "Add your name in Settings before others can find you.";

  it("routes the onboarding blocker to onboarding", () => {
    expect(listingFix(ONBOARDING)).toBe("onboarding");
  });

  it("routes the missing-name blocker to the name", () => {
    expect(listingFix(NAME)).toBe("name");
  });

  it("offers nothing when there is no blocker", () => {
    expect(listingFix(null)).toBeNull();
    expect(listingFix(undefined)).toBeNull();
    expect(listingFix("")).toBeNull();
  });

  it("offers nothing for a reason it does not recognise", () => {
    // A pause, or a reason a newer server invented. A button labelled from an
    // unparsed sentence would lead somewhere arbitrary, which is worse than the
    // sentence on its own.
    expect(listingFix("Holiday mode is on, so nobody can find you here.")).toBeNull();
    expect(listingFix("You already have a buddy, so people looking for one won't see you.")).toBeNull();
    expect(listingFix("Some reason from a future release.")).toBeNull();
  });

  it("does not care about case", () => {
    expect(listingFix(ONBOARDING.toUpperCase())).toBe("onboarding");
  });

  it("labels each fix, and nothing when there is none", () => {
    expect(listingFixLabel("onboarding")).toBe("Set up");
    expect(listingFixLabel("name")).toBe("Add name");
    expect(listingFixLabel(null)).toBeNull();
  });

  it("keeps every label short enough for the status bar", () => {
    // A button is laid out before the text beside it, so a long label does not
    // wrap — it steals the sentence's width and ellipsises it. Ten characters
    // is the budget that leaves the reason two readable lines on a 320pt phone.
    for (const fix of ["onboarding", "name"] as const) {
      expect(listingFixLabel(fix)!.length).toBeLessThanOrEqual(10);
    }
  });
});
