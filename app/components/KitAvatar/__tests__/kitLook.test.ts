import { KIT_PARTS, KIT_SLOTS, kitManifest, liveFigure, stillSvg } from "../kitLook";
import { DEFAULT_MANIFEST, type AvatarManifest } from "../../../types/avatar";

/**
 * The kit renderer must draw ANY stored manifest: no real users yet, so no
 * migration, but an old or unknown part id must never crash a screen. It draws
 * the kit default for that slot instead.
 */
const OLD: AvatarManifest = {
  version: 1,
  parts: { bg: "bg.hearts", aura: "aura.glow", head: "head.classic", face: "face.joy", hair: "hair.afro", beard: "beard.walrus",
    headgear: "headgear.tourist", eyewear: "eyewear.aviator", collar: "collar.clerical", prop: "prop.camera" },
  colors: { skin: "#7A4A2B", hair: "#241E1A", bg: "#8A6FB0", collar: "#3A5A8C" },
};

describe("kitManifest", () => {
  it("draws the kit default for every old or unknown part id", () => {
    const k = kitManifest(OLD);
    expect(k.parts).toMatchObject({ face: "face.calm", hair: null, beard: null, headgear: null, eyewear: null, collar: "collar.v4_polo_v4_n", bg: null, aura: null, prop: null });   // bg.hearts is no blob shape
    expect(k.colors.skin).toBe("#7A4A2B");
  });

  it("keeps an id the old and new part sets share, and resolves kit aliases", () => {
    const k = kitManifest({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, hair: "hair.curls", headgear: "headgear.beanie" } });
    expect(k.parts.hair).toBe("hair.tightcurls");
    expect(k.parts.headgear).toBe("headgear.beanie");
  });

  it("never puts a part in the wrong slot", () => {
    const k = kitManifest({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, hair: "headgear.beanie" } });
    expect(k.parts.hair).toBeNull();
  });

  it("always wears a collar (the kit needs one)", () => {
    expect(kitManifest({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, collar: null } }).parts.collar).toBe("collar.v4_polo_v4_n");
  });

  it("keeps a known blob shape in bg; an unknown one (an old backdrop) is the default shape", () => {
    expect(kitManifest({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, bg: "bg.curly" } }).parts.bg).toBe("bg.curly");
    expect(kitManifest({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, bg: "bg.hearts" } }).parts.bg).toBeNull();
    expect(stillSvg({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, bg: "bg.curly" } })).not.toBe(stillSvg(DEFAULT_MANIFEST));
    expect(liveFigure({ ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, bg: "bg.curly" } }).blob.d).not.toBe(liveFigure(null).blob.d);
  });

  it("draws the ring variant with no blob", () => {
    const ring = stillSvg(null, "ring");
    expect(ring).toContain("<circle");
    expect(ring).not.toContain(liveFigure(null).blob.d);
  });

  it("survives junk", () => {
    [null, undefined, {} as AvatarManifest, { parts: 3, colors: "x" } as unknown as AvatarManifest].forEach((m) =>
      expect(() => kitManifest(m)).not.toThrow());
  });
});

describe("stillSvg", () => {
  it("draws the default, an old manifest and both variants", () => {
    [null, OLD].forEach((m) => {
      const blob = stillSvg(m, "blob"), frame = stillSvg(m, "frame");
      expect(blob.startsWith("<svg")).toBe(true);
      expect(frame.startsWith("<svg")).toBe(true);
      expect(blob).toContain("<path");
      expect(blob).not.toContain("data-part");
    });
  });

  it("gives identical pictures identical ids and different pictures different ids", () => {
    const id = (s: string) => (s.match(/clipPath id="([^"]+)"/) || [])[1];
    expect(id(stillSvg(OLD))).toBe(id(stillSvg({ ...OLD })));
    expect(id(stillSvg(OLD))).not.toBe(id(stillSvg(null)));
  });
});

describe("liveFigure", () => {
  it("makes a look and a still for every part the Studio offers", () => {
    KIT_SLOTS.forEach((slot) => {
      KIT_PARTS[slot].forEach((id) => {
        const m = { ...DEFAULT_MANIFEST, parts: { ...DEFAULT_MANIFEST.parts, [slot]: id } };
        const L = liveFigure(m);
        expect(L.look.layers.length).toBeGreaterThan(3);
        expect(L.cut.startsWith("M")).toBe(true);
        expect(stillSvg(m).startsWith("<svg")).toBe(true);
      });
    });
  });
});
