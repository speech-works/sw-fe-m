import {
  ACT_ONE_FLOW,
  ACT_ONE_ADAPTIVE_KEYS,
  ACT_ONE_SITUATION_VALUES,
  ACT_ONE_GOAL_VALUES,
  ACT_ONE_AVOIDANCE_VALUES,
  ACT_ONE_SHAPE_VALUES,
  SITUATION_PHRASE,
} from "../onboardingActOne";

/**
 * DRIFT GUARD for the bundled Act-1 question set.
 *
 * Act 1 ships inside the app so it can run before an account exists, which
 * means its answer values are no longer guaranteed to match the backend by
 * construction. If one drifts, the replayed answer is unreadable and the
 * recommendation silently falls back to a clinical guess — the same failure
 * mode as the `opt-${Math.random()}` bug, just arriving by a different route.
 *
 * The backend has a mirrored test pinning the same literals.
 */
describe("Act 1 bundled flow", () => {
  const questions = ACT_ONE_FLOW.questions;

  it("asks exactly the five Act-1 signals, in value order", () => {
    expect(questions.map((q) => q.adaptiveKey)).toEqual([
      ...ACT_ONE_ADAPTIVE_KEYS,
    ]);
  });

  it("puts situations first — that one answer IS the recommender", () => {
    expect(questions[0].adaptiveKey).toBe("speech.situations");
    expect(questions[0].questionType).toBe("MULTI");
  });

  it("shows one question per screen", () => {
    const screens = questions.map((q) => q.screenNumber);
    expect(new Set(screens).size).toBe(questions.length);
    expect(screens).toEqual([1, 2, 3, 4, 5]);
  });

  it("submits option VALUES as ids, never a generated token", () => {
    for (const q of questions) {
      for (const o of q.options) {
        expect(o.id).toBe(String(o.value));
        // The bug this whole guard exists for.
        expect(o.id).not.toMatch(/^opt-/);
      }
    }
  });

  it("uses only values the backend enums can decode", () => {
    const allowed: Record<string, readonly string[]> = {
      "speech.situations": ACT_ONE_SITUATION_VALUES,
      "goal.primary": ACT_ONE_GOAL_VALUES,
      "avoidance.frequency": ACT_ONE_AVOIDANCE_VALUES,
      "difficulty.shape": ACT_ONE_SHAPE_VALUES,
      // Likert 1-5; the server rescales to the 20-100 clinical scale.
      "distress.overall": ["1", "2", "3", "4", "5"],
    };

    for (const q of questions) {
      const permitted = allowed[q.adaptiveKey as string];
      expect(permitted).toBeDefined();
      for (const o of q.options) {
        expect(permitted).toContain(String(o.value));
      }
    }
  });

  it("keeps distress on the 1-5 Likert the rescale expects", () => {
    const distress = questions.find((q) => q.adaptiveKey === "distress.overall");
    expect(distress?.options.map((o) => o.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("opts ordered five-point questions into the compact scale layout", () => {
    const orderedScaleKeys = ["avoidance.frequency", "distress.overall"];
    for (const key of orderedScaleKeys) {
      expect(questions.find((q) => q.adaptiveKey === key)?.layout).toBe("scale");
    }
  });

  /**
   * Direction is the thing worth guarding. A reader learns which end is "more"
   * from the first scale and answers the next one on that muscle memory, so two
   * scales pointing opposite ways in the same flow produces wrong answers that
   * look perfectly valid in the data. Asserting the exact rendered order catches
   * a flip that no type or lint rule would.
   */
  it("orders every scale from lowest to highest", () => {
    const expected: Record<string, string[]> = {
      "avoidance.frequency": [
        "Almost never",
        "Rarely",
        "Sometimes",
        "Often",
        "Very often",
      ],
      "distress.overall": [
        "Not heavy at all",
        "A little heavy",
        "Moderately heavy",
        "Very heavy",
        "Extremely heavy",
      ],
    };

    for (const [key, labels] of Object.entries(expected)) {
      const q = questions.find((it) => it.adaptiveKey === key);
      expect(q?.layout).toBe("scale");
      expect(q?.options.map((o) => o.optionText)).toEqual(labels);
      // Display order must be a clean 1..n, so "first" is unambiguous.
      expect(q?.options.map((o) => o.orderIndex)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("has a recognition phrase for every real situation", () => {
    // NONE / NOT_SURE carry no targeting information and are never echoed back.
    const targetable = ACT_ONE_SITUATION_VALUES.filter(
      (v) => v !== "none" && v !== "not_sure",
    );
    for (const v of targetable) {
      expect(SITUATION_PHRASE[v]).toBeTruthy();
    }
  });

  it("gives every option distinct, non-empty display text", () => {
    for (const q of questions) {
      const texts = q.options.map((o) => o.optionText);
      expect(texts.every(Boolean)).toBe(true);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it("is a CONTIGUOUS PREFIX — screens 1..N with no gaps, in order", () => {
    // The property that makes the post-signup resume work. `resumeFrom` finds
    // the first screen with an unanswered required question and then walks
    // forward one screen at a time, so a gap anywhere in Act 1 lands someone
    // mid-flow and marches them back through questions they already answered.
    //
    // This nearly broke when difficulty.shape was inserted at screen 2: the
    // server shifted goal/avoidance/distress down by one while the bundled
    // flow did not, which would have re-asked three questions of every user
    // who came through Act 1.
    const screens = questions.map((q) => q.screenNumber).sort((a, b) => a - b);
    expect(screens).toEqual(screens.map((_, i) => i + 1));
    expect(new Set(screens).size).toBe(screens.length);
  });
});
