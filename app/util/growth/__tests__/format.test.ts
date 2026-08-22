import { GrowthAxis, VISIBLE_AXES, isVisibleAxis } from "../../../api/dailyPlan";
import { countPhrase, lastAtPhrase, FIRST_STEP } from "../format";

/**
 * ============================================================================
 * THE UNIT IS THE CLAIM
 * ----------------------------------------------------------------------------
 * The server counts each axis in a different unit on purpose, and the words
 * have to carry that or two of the three numbers become false. "2 times" under
 * "how much of your life is back in play" reads as two attempts; the number
 * actually means two KINDS of situation. This is the likeliest silent
 * regression in the whole feature — a tidy-up that unifies three nouns into
 * "times" would look like an improvement and quietly restate the data.
 * ============================================================================
 */

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

describe("countPhrase", () => {
  const VISIBLE = [GrowthAxis.BRAVER, GrowthAxis.WIDER, GrowthAxis.REGULAR];

  it("gives each axis the noun its number actually means", () => {
    expect(countPhrase(GrowthAxis.BRAVER, 6)).toBe("6 hard things done");
    // NOT "times" — the server counts distinct speech acts here.
    expect(countPhrase(GrowthAxis.WIDER, 2)).toBe("2 kinds of situation");
    // NOT "times" — the server counts distinct days here.
    expect(countPhrase(GrowthAxis.REGULAR, 21)).toBe("21 days practised");
  });

  it("says one of each properly", () => {
    expect(countPhrase(GrowthAxis.BRAVER, 1)).toBe("1 hard thing done");
    expect(countPhrase(GrowthAxis.WIDER, 1)).toBe("1 kind of situation");
    expect(countPhrase(GrowthAxis.REGULAR, 1)).toBe("1 day practised");
  });

  it("stands on its own, with no axis name in front of it", () => {
    // The property the done-practice chip depends on. "6 times" needed
    // "Braver" beside it to mean anything, and Braver is a word we invented and
    // the reader has to be taught. A bare unit here would put that word back.
    const bare = /^\d+ (times?|days?)$/;
    for (const axis of VISIBLE) {
      expect(countPhrase(axis, 6)).not.toMatch(bare);
      expect(countPhrase(axis, 1)).not.toMatch(bare);
    }
  });

  it("never says one of the retired axis names", () => {
    const invented = /braver|wider|steadier|finisher|regular/i;
    for (const axis of VISIBLE) {
      expect(countPhrase(axis, 3)).not.toMatch(invented);
    }
  });

  it("gives the three visible axes three different nouns", () => {
    // They count different things. One shared noun would quietly restate them
    // as one measure and make two of the three false.
    const nouns = VISIBLE.map((a) => countPhrase(a, 5).replace(/^\d+ /, ""));
    expect(new Set(nouns).size).toBe(3);
  });
});

describe("lastAtPhrase", () => {
  it("prefers words a person would use", () => {
    expect(lastAtPhrase(daysAgo(0))).toBe("today");
    expect(lastAtPhrase(daysAgo(1))).toBe("yesterday");
    // Inside a week, the weekday is instantly placeable in a way a date is not.
    expect(lastAtPhrase(daysAgo(3))).toMatch(
      /^on (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/,
    );
  });

  it("becomes a date past a week, never a countdown", () => {
    // Deliberately NOT "23 days ago". A date reads as history; a days-since
    // number reads as a running tally of how long you have failed to manage it.
    const old = lastAtPhrase(daysAgo(23));
    expect(old).toMatch(/^on \d{1,2} [A-Z][a-z]{2}$/);
    expect(old).not.toMatch(/ago/);
  });

  it("returns null when there is nothing to date", () => {
    expect(lastAtPhrase(null)).toBeNull();
    expect(lastAtPhrase("not-a-date")).toBeNull();
  });
});

describe("what the user is shown", () => {
  it("shows three axes, and never Finisher", () => {
    // A display decision, not a data one — the server still returns all four,
    // and the enum, registry and daily plan all still know about STEADIER.
    // Finisher is withheld because only two of the ten growth points move it,
    // one metered by cost and one with a single item in the catalogue, so it
    // would sit visibly stuck beside three axes that move daily.
    expect(VISIBLE_AXES).toEqual([
      GrowthAxis.BRAVER,
      GrowthAxis.WIDER,
      GrowthAxis.REGULAR,
    ]);
    expect(isVisibleAxis(GrowthAxis.STEADIER)).toBe(false);
  });

  it("offers a first step for every axis it shows", () => {
    // An axis on screen at zero with no "what would move this" line is a
    // verdict with no door out of it.
    for (const axis of VISIBLE_AXES) {
      expect(`${axis}:${Boolean(FIRST_STEP[axis])}`).toBe(`${axis}:true`);
    }
  });

  it("never words a first step as something the person failed to do", () => {
    // "Not yet" rather than "You haven't" — the ledger is the app's, not
    // theirs. The distinction matters for people who arrive already convinced
    // they are the problem.
    for (const axis of VISIBLE_AXES) {
      expect(`${axis}:${/you have|you've|you haven't/i.test(FIRST_STEP[axis])}`)
        .toBe(`${axis}:false`);
    }
  });
});
