import { splitShadowAndClip } from "../shadowSplit";

/**
 * The shadow-plus-clip split.
 *
 * The bug it guards against has shipped twice: a view asked to cast a shadow
 * AND clip a rounded corner stops clipping on iOS, and the gradient inside it
 * renders square. Both sightings were on the paper scheme only, because the ink
 * scheme's elevation uses the legacy `shadow*` props instead of `boxShadow`.
 */
describe("splitShadowAndClip", () => {
  it("leaves an ordinary style alone", () => {
    // The overwhelmingly common case. Returning null is what makes adopting
    // this a no-op for every caller that was already correct.
    expect(splitShadowAndClip({ borderRadius: 24, padding: 16 })).toBeNull();
  });

  it("leaves a shadow with no radius alone", () => {
    // Nothing to clip, so nothing to fight over.
    expect(splitShadowAndClip({ shadowColor: "#000", shadowRadius: 8 })).toBeNull();
  });

  it("handles an undefined style", () => {
    expect(splitShadowAndClip(undefined)).toBeNull();
  });

  it("splits the legacy shadow props off the clip", () => {
    const s = splitShadowAndClip({
      borderRadius: 24,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    });
    expect(s).not.toBeNull();
    expect(s!.outer).toMatchObject({
      borderRadius: 24,
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    });
    // The shadow must not stay behind, or the split achieves nothing.
    expect(s!.inner).not.toHaveProperty("shadowColor");
    expect(s!.inner).not.toHaveProperty("elevation");
    expect(s!.inner).toMatchObject({ borderRadius: 24, padding: 16, overflow: "hidden" });
  });

  it("splits the boxShadow form too, which is the one that actually broke", () => {
    // The paper scheme resolves `elevation` to this on iOS.
    const s = splitShadowAndClip({
      borderRadius: 24,
      boxShadow: "0px 8px 20px rgba(0,0,0,0.09)",
    });
    expect(s!.outer).toHaveProperty("boxShadow");
    expect(s!.inner).not.toHaveProperty("boxShadow");
    expect(s!.inner.overflow).toBe("hidden");
  });

  it("sends the layout box outward and the content styles inward", () => {
    // Once wrapped, the OUTER view is the one the parent lays out, so anything
    // describing where the box sits has to travel with it.
    const s = splitShadowAndClip({
      borderRadius: 16,
      elevation: 4,
      width: 120,
      marginTop: 8,
      alignSelf: "center",
      position: "absolute",
      top: 4,
      padding: 12,
      gap: 8,
      alignItems: "center",
    });
    expect(s!.outer).toMatchObject({
      width: 120,
      marginTop: 8,
      alignSelf: "center",
      position: "absolute",
      top: 4,
    });
    expect(s!.inner).toMatchObject({ padding: 12, gap: 8, alignItems: "center" });
    expect(s!.inner).not.toHaveProperty("width");
    expect(s!.inner).not.toHaveProperty("marginTop");
  });

  it("keeps the radius on both halves", () => {
    // The outer needs it so the shadow traces the rounded shape rather than a
    // rectangle; the inner needs it to clip.
    const s = splitShadowAndClip({ borderRadius: 20, elevation: 4 });
    expect(s!.outer.borderRadius).toBe(20);
    expect(s!.inner.borderRadius).toBe(20);
  });

  it("flattens an array style before deciding", () => {
    // Call sites routinely pass [styles.card, { ...something }].
    const s = splitShadowAndClip([{ borderRadius: 12 }, { elevation: 2, padding: 4 }]);
    expect(s).not.toBeNull();
    expect(s!.outer.elevation).toBe(2);
    expect(s!.inner.padding).toBe(4);
  });
});
