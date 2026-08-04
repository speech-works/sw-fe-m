import { getMoodRemark } from "../helper";

/**
 * Two things are pinned here, and the second is the reason this file exists.
 *
 * 1. The branch ladder. Nine conditions with overlapping thresholds, evaluated
 *    in order, where an earlier `if` silently shadows a later one. Reordering
 *    them looks harmless and isn't.
 *
 * 2. THE GUARDRAIL. Two branches used to end on a speech outcome ("This mindset
 *    supports confident speech", "an excellent foundation for smoother speech").
 *    Both made fluency the payoff, which is the metric this product refuses to
 *    keep, and both implied emotional state is what drives stammering. The
 *    regex below is the same technique constants/__tests__/reminderTemplates
 *    uses, narrowed to the words that turn a mood note into a claim about
 *    someone's speech.
 */

/** Words that turn a mood remark into a claim about how someone sounds. */
const SPEECH_CLAIM = /fluen|smooth|confident speech|speech (will|gets?|becomes)|better speech/i;

const ALL_MOODS = ["HAPPY", "CALM", "SAD", "ANGRY"] as const;

/** Every branch, with inputs chosen to reach it past the ones above it. */
const CASES: { name: string; stats: Record<string, number>; expect: RegExp }[] = [
  { name: "no data at all", stats: {}, expect: /^Log your mood/ },
  { name: "strongly positive", stats: { HAPPY: 50, CALM: 30 }, expect: /^A mostly good week/ },
  { name: "happy and sad together", stats: { HAPPY: 40, SAD: 30 }, expect: /^Ups and downs/ },
  { name: "calm, little negative", stats: { CALM: 50, SAD: 10 }, expect: /^A calm week/ },
  { name: "mostly sad", stats: { SAD: 40 }, expect: /^A heavy week/ },
  { name: "mostly angry", stats: { ANGRY: 40 }, expect: /^Frustration ran high/ },
  { name: "sad and angry, little positive", stats: { SAD: 35, ANGRY: 30 }, expect: /^A tough week/ },
  { name: "mixed positive and negative", stats: { HAPPY: 30, SAD: 20, ANGRY: 15 }, expect: /^A mix of moods/ },
  { name: "fallback", stats: { HAPPY: 10 }, expect: /^Keep logging/ },
];

describe("getMoodRemark", () => {
  it.each(CASES)("returns the $name remark", ({ stats, expect: pattern }) => {
    expect(getMoodRemark(stats)).toMatch(pattern);
  });

  it("never claims anything about the user's speech", () => {
    // Sweep the whole input space coarsely rather than only the nine cases
    // above, so a newly added branch is covered the moment it exists.
    const offenders: string[] = [];
    for (const a of ALL_MOODS) {
      for (const b of ALL_MOODS) {
        for (const v of [0, 10, 30, 40, 50, 70, 100]) {
          const remark = getMoodRemark({ [a]: v, [b]: 100 - v });
          if (SPEECH_CLAIM.test(remark)) offenders.push(remark);
        }
      }
    }
    expect(Array.from(new Set(offenders))).toEqual([]);
  });

  it("always returns a non-empty string", () => {
    for (const { stats } of CASES) {
      expect(getMoodRemark(stats).trim().length).toBeGreaterThan(0);
    }
  });

  it("has no em dashes", () => {
    for (const { stats } of CASES) {
      expect(getMoodRemark(stats)).not.toContain("—");
    }
  });
});
