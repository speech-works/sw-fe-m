import { GrowthAxis, AXIS_LABEL, AXIS_SUBTITLE, LOOP_TODAY } from "../index";

/**
 * ============================================================================
 * WHAT THE FOUR NUMBERS ARE ALLOWED TO BE CALLED
 * ----------------------------------------------------------------------------
 * These labels are the only place the axes become words a user reads, and two
 * of them were changed for reasons that are easy to lose later.
 *
 * THE SAME REFUSAL IS PINNED ELSEWHERE: `app/constants/__tests__/
 * reminderTemplates.test.ts` enforces it for push copy, after five reminder
 * messages turned out to be making exactly the claim this file forbids. If you
 * are adding user-facing words about how someone sounds, both tests are
 * relevant.
 * ============================================================================
 */
describe("Growth axis labels", () => {
  it("shows STEADIER as 'Finisher', never as a fluency claim", () => {
    // THE ONE THAT MATTERS. In a stuttering app "Steadier" is read as "my
    // speech is steadier" — smoother, less shaky, more fluent. We refuse to
    // measure fluency; it is a core part of how the product differentiates
    // itself. A number called Steadier that goes up asserts exactly the thing
    // we have committed to never claiming, and no subtitle can undo a word that
    // makes the wrong claim by itself.
    //
    // The enum keeps its stored value so nothing has to migrate; only the label
    // changed.
    expect(AXIS_LABEL[GrowthAxis.STEADIER]).toBe("Finisher");
    expect(AXIS_LABEL[GrowthAxis.STEADIER].toLowerCase()).not.toContain("steady");
    expect(AXIS_LABEL[GrowthAxis.STEADIER].toLowerCase()).not.toContain("smooth");
  });

  it("gives every axis a subtitle, because Wider is meaningless without one", () => {
    // "Wider" alone reads as "did a wider variety of exercises" — app breadth
    // rather than life breadth, which is the dishonest meaning the axis was
    // nearly renamed to escape. It survives ONLY because its misreading is
    // vague rather than false, and a subtitle fixes vague. Shipping the label
    // without it reintroduces the problem the name was allowed to keep.
    for (const axis of Object.values(GrowthAxis)) {
      expect(AXIS_SUBTITLE[axis]).toBeTruthy();
      expect(AXIS_SUBTITLE[axis].length).toBeGreaterThan(8);
    }
    // Wider must still be anchored OUTSIDE the app. This asserted the word
    // "life" back when the subtitle read "how much of your life is back in
    // play" — a metaphor that passed the test while telling the user nothing
    // about what the number counts. The copy now names the thing itself, so
    // the check names it too.
    expect(AXIS_SUBTITLE[GrowthAxis.WIDER].toLowerCase()).toContain("situations");
    expect(AXIS_SUBTITLE[GrowthAxis.WIDER].toLowerCase()).toContain("spoken");
  });

  it("makes every visible subtitle name what its number counts", () => {
    // THE RULE THE COPY REWRITE INTRODUCED. Each subtitle sits directly above a
    // bare figure, so it has to answer "a count of what?" on one read. The
    // previous set — "taking on harder things", "turning up" — described an
    // activity rather than a quantity, which left the number beside it
    // unexplained and made "11" look like a score.
    //
    // Approximated as: it reads as a plural noun phrase about the person's own
    // actions. Cheap, but it fails on a relapse to an idiom, which is the
    // regression that actually happened.
    for (const axis of [GrowthAxis.BRAVER, GrowthAxis.WIDER, GrowthAxis.REGULAR]) {
      const subtitle = AXIS_SUBTITLE[axis];
      expect(`${axis}:${/^[A-Z]/.test(subtitle)}`).toBe(`${axis}:true`);
      expect(`${axis}:${/(things|situations|days|times)/i.test(subtitle)}`).toBe(
        `${axis}:true`,
      );
    }
  });

  it("labels every axis, so a new one cannot ship nameless", () => {
    for (const axis of Object.values(GrowthAxis)) {
      expect(AXIS_LABEL[axis]).toBeTruthy();
    }
  });
});

/**
 * The daily wording. Separate from AXIS_LABEL/AXIS_SUBTITLE because those
 * describe a lifetime count, and a lifetime phrasing on a daily ring reads as
 * circular: "days you've practiced" on a segment that closes the moment you
 * practise once, today.
 */
describe("LOOP_TODAY", () => {
  const axes = Object.values(GrowthAxis);

  it("covers every axis, so a segment can never render blank", () => {
    for (const axis of axes) {
      expect(LOOP_TODAY[axis]).toBeTruthy();
    }
  });

  it("carries none of the invented names", () => {
    // The whole reason it exists: nothing here should need teaching before the
    // ring means anything.
    for (const axis of axes) {
      const phrase = LOOP_TODAY[axis].toLowerCase();
      for (const invented of ["braver", "wider", "steadier", "finisher", "regular"]) {
        expect(phrase).not.toContain(invented);
      }
    }
  });

  it("says nothing about a lifetime, because this is about today", () => {
    for (const axis of axes) {
      const phrase = LOOP_TODAY[axis].toLowerCase();
      expect(phrase).not.toMatch(/you've|days|so far|total|times you/);
    }
  });

  it("makes no claim about fluency", () => {
    // The standing rule for every axis word this app shows.
    for (const axis of axes) {
      const phrase = LOOP_TODAY[axis].toLowerCase();
      expect(phrase).not.toMatch(/smooth|fluent|steady|stutter-free/);
    }
  });

  it("stays short enough for the chip in the practice hub", () => {
    for (const axis of axes) {
      expect(LOOP_TODAY[axis].length).toBeLessThanOrEqual(36);
    }
  });
});
