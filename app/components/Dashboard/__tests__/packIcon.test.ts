import { icons } from "../../../design-system";
import { FALLBACK_PACK_ICON, SEEDED_PACK_ICONS, packIconFor } from "../packIcon";

describe("packIconFor", () => {
  it("resolves every key the server actually sends", () => {
    // A COPY of the backend's src/seed/pack/packIcon.ts, on purpose: the two
    // repos deploy separately, so importing would only prove they agree in a
    // checkout where both are present. If this fails, an icon was renamed in
    // the registry and the seed was not updated, and every program's card is
    // about to fall back to the same generic mark.
    for (const key of SEEDED_PACK_ICONS) {
      expect(icons).toHaveProperty(key);
      expect(packIconFor(key)).toBe(key);
    }
  });

  it("gives every program a DIFFERENT mark", () => {
    // A watermark that is the same shape on three cards tells the buyer
    // nothing, which is the whole reason this replaced a shared bolt.
    const glyphs = SEEDED_PACK_ICONS.map((k) => icons[packIconFor(k)]);
    expect(new Set(glyphs).size).toBe(SEEDED_PACK_ICONS.length);
  });

  it("falls back rather than rendering a hole", () => {
    // `icons[unknown]` is undefined, which reaches Icon as a missing path and
    // draws an empty 220pt SVG. Every one of these is a real arrival: an old
    // build meeting a new program, a console-created pack, a null column.
    for (const bad of ["notAnIcon", "", null, undefined, "Energy", "__proto__"]) {
      expect(packIconFor(bad as string)).toBe(FALLBACK_PACK_ICON);
    }
  });

  it("never returns a key the registry lacks", () => {
    for (const key of [...SEEDED_PACK_ICONS, "nope", null]) {
      expect(icons).toHaveProperty(packIconFor(key as string));
    }
  });

  it("keeps the fallback the mark every program used to share", () => {
    // So the worst case is exactly the card we had before per-program icons.
    expect(FALLBACK_PACK_ICON).toBe("energy");
  });
});
