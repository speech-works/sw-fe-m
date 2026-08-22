import { GrowthAxis, AXIS_SUBTITLE, LOOP_TODAY, visibleTotals } from "../index";

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
  it("shows no invented axis name to a user, on any surface", () => {
    // THE ONE THAT MATTERS NOW. Braver, Wider, Regular and Finisher were words
    // this app made up and then had to teach: everywhere one appeared, a second
    // line appeared under it to say what it meant. Three surfaces carried them.
    // The Today ring was deleted, the completion chip says "11 hard things
    // done", and the progress report leads with the plain sentence.
    //
    // `visibleTotals` is the single path every screen takes to render these
    // counts, so pinning it here covers all of them at once. The enum keeps its
    // stored values: renaming a server key to match a copy decision would be a
    // migration for nothing.
    const invented = /braver|wider|steadier|finisher|regular/i;
    const rows = visibleTotals({
      axes: Object.values(GrowthAxis).map((axis) => ({
        axis,
        count: 3,
        lastAt: null,
      })),
    } as never);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(`${row.axis}:${invented.test(row.label)}`).toBe(`${row.axis}:false`);
    }
  });

  it("gives every axis a plain name, because it is the only one shown", () => {
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

  it("names every axis, so a new one cannot ship nameless", () => {
    for (const axis of Object.values(GrowthAxis)) {
      expect(AXIS_SUBTITLE[axis]).toBeTruthy();
    }
  });
});

/**
 * The daily wording. Separate from AXIS_SUBTITLE because that describes a
 * lifetime count, and a lifetime phrasing on a daily ring reads as
 * circular: "days you've practiced" on a segment that closes the moment you
 * practise once, today.
 */
describe("LOOP_TODAY", () => {
  const axes = Object.values(GrowthAxis);

  it("gives every axis both lines, so a row can never render half-empty", () => {
    for (const axis of axes) {
      expect(LOOP_TODAY[axis].name).toBeTruthy();
      expect(LOOP_TODAY[axis].hint).toBeTruthy();
    }
  });

  it("carries none of the invented names", () => {
    for (const axis of axes) {
      const text = `${LOOP_TODAY[axis].name} ${LOOP_TODAY[axis].hint}`.toLowerCase();
      for (const invented of ["braver", "wider", "steadier", "finisher", "regular"]) {
        expect(text).not.toContain(invented);
      }
    }
  });

  it("claims nothing the app cannot actually check", () => {
    // The defect this exists for. The first version said "something harder
    // than usual" and "somewhere you don't usually speak". The app never
    // compares anything to a person's usual, and has no idea where they
    // normally speak. What closes a segment is a fixed set of activity types.
    for (const axis of axes) {
      const text = `${LOOP_TODAY[axis].name} ${LOOP_TODAY[axis].hint}`.toLowerCase();
      expect(text).not.toMatch(/usual|normally|harder than|you don't usually/);
    }
  });

  it("names an exercise the user can go and open", () => {
    // Every row has to answer "so what do I do?". The vocabulary of the app's
    // actual activity types is the only honest way to do that.
    const doable = /call|interview|challenge|practice|reading|breathing|technique|finish/;
    for (const axis of axes) {
      const text = `${LOOP_TODAY[axis].name} ${LOOP_TODAY[axis].hint}`.toLowerCase();
      expect(text).toMatch(doable);
    }
  });

  it("says nothing about a lifetime, because this is about today", () => {
    for (const axis of axes) {
      const text = `${LOOP_TODAY[axis].name} ${LOOP_TODAY[axis].hint}`.toLowerCase();
      expect(text).not.toMatch(/you've|days|so far|total|times you/);
    }
  });

  it("makes no claim about fluency", () => {
    for (const axis of axes) {
      const text = `${LOOP_TODAY[axis].name} ${LOOP_TODAY[axis].hint}`.toLowerCase();
      expect(text).not.toMatch(/smooth|fluent|steady|stutter-free/);
    }
  });

  it("keeps both lines short enough for the chip in the practice hub", () => {
    for (const axis of axes) {
      expect(LOOP_TODAY[axis].name.length).toBeLessThanOrEqual(26);
      expect(LOOP_TODAY[axis].hint.length).toBeLessThanOrEqual(44);
    }
  });
});
