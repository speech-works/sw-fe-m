import { GrowthAxis, AXIS_LABEL, AXIS_SUBTITLE } from "../index";

/**
 * ============================================================================
 * WHAT THE FOUR NUMBERS ARE ALLOWED TO BE CALLED
 * ----------------------------------------------------------------------------
 * These labels are the only place the axes become words a user reads, and two
 * of them were changed for reasons that are easy to lose later.
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
    expect(AXIS_SUBTITLE[GrowthAxis.WIDER]).toContain("life");
  });

  it("labels every axis, so a new one cannot ship nameless", () => {
    for (const axis of Object.values(GrowthAxis)) {
      expect(AXIS_LABEL[axis]).toBeTruthy();
    }
  });
});
