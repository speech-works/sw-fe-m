import { crowdAvatar, illustrativeCrowd } from "../crowdAvatars";
import {
  SKIN_TONES,
  HAIR_COLORS,
  BG_COLORS,
  COLLAR_COLORS,
  PART_REGISTRY,
  partTier,
} from "../../../assets/avatar/registry";
import type { AvatarManifest, AvatarSlot } from "../../../types/avatar";

/**
 * The Community wall's faces are ILLUSTRATIONS, not users. They are generated
 * on-device, stand for nobody, and the caption beside them is an invitation
 * rather than a count — which is what makes drawing them acceptable at all.
 *
 * What these tests hold: the crowd looks like it belongs to this product (only
 * colours and parts the studio itself offers), it is stable rather than
 * reshuffling on every render, and it SHOWS OFF the wardrobe rather than
 * hiding it.

 * That last one reverses an earlier rule. The wall used to be everyday-only, so
 * a stranger could not imply progression nobody made. Over-applied: these are
 * illustrations, so a crown on one makes no claim about any person. The
 * honesty question was always the caption beside the wall, never the clothes.
 */

describe("crowdAvatar", () => {
  it("is deterministic — the same person is the same face every render", () => {
    const a = crowdAvatar("user-abc");
    const b = crowdAvatar("user-abc");
    expect(a).toEqual(b);
  });

  it("gives different people different faces", () => {
    const seeds = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    const looks = seeds.map((s) => JSON.stringify(crowdAvatar(s)));
    // A wall of nine identical defaults is the whole bug. Expect real spread,
    // not merely "more than one".
    expect(new Set(looks).size).toBeGreaterThanOrEqual(7);
  });

  it("varies skin, hair and backdrop independently", () => {
    // Deriving every slot from one `hash % n` correlates the choices and
    // produces visible families of near-identical tiles.
    const seeds = Array.from({ length: 24 }, (_, i) => `p${i}`);
    const skins = new Set(seeds.map((s) => crowdAvatar(s).colors.skin));
    const hairs = new Set(seeds.map((s) => crowdAvatar(s).colors.hair));
    const bgs = new Set(seeds.map((s) => crowdAvatar(s).colors.bg));
    expect(skins.size).toBeGreaterThan(2);
    expect(hairs.size).toBeGreaterThan(2);
    expect(bgs.size).toBeGreaterThan(2);
  });

  it("only ever uses colours the studio itself offers", () => {
    // A generated face must be one a person could have built, or the wall is
    // showing something the product cannot produce.
    const skin = new Set(SKIN_TONES.map((s) => s.hex));
    const hair = new Set(HAIR_COLORS.map((s) => s.hex));
    const bg = new Set(BG_COLORS.map((s) => s.hex));
    const collar = new Set(COLLAR_COLORS.map((s) => s.hex));

    for (let i = 0; i < 30; i++) {
      const a = crowdAvatar(`x${i}`);
      expect(skin.has(a.colors.skin)).toBe(true);
      expect(hair.has(a.colors.hair)).toBe(true);
      expect(bg.has(a.colors.bg)).toBe(true);
      expect(collar.has(a.colors.collar)).toBe(true);
    }
  });

  it("actually shows off the earned wardrobe", () => {
    // The wall is the shop window. A silent revert to everyday-only would look
    // completely fine on screen and quietly stop selling anything, which is
    // exactly the kind of regression nobody files a bug for.
    const wall = Array.from({ length: 60 }, (_, i) => crowdAvatar(`t${i}`));
    const premium = new Set<string>();
    wall.forEach((a) => {
      [a.parts.headgear, a.parts.eyewear, a.parts.collar].forEach((id) => {
        if (id && partTier(id) !== "everyday") premium.add(id);
      });
    });
    expect(premium.size).toBeGreaterThanOrEqual(6);
  });

  it("leans premium in the slots where a silhouette is the point", () => {
    // Of the heads that DO wear something, most wear something worth wanting.
    // Note this is mostly the CATALOG talking, not the weight: headgear is 18
    // premium to 5 everyday, so even a flat draw lands near 78%. The weight is
    // a nudge, and it earns its keep in eyewear, which is close to even.
    const wall = Array.from({ length: 200 }, (_, i) => crowdAvatar(`w${i}`));
    const share = (f: (a: AvatarManifest) => string | null) => {
      const worn = wall.map(f).filter((g): g is string => g !== null);
      return worn.filter((g) => partTier(g) !== "everyday").length / worn.length;
    };
    expect(share((a) => a.parts.headgear)).toBeGreaterThan(0.5);
    expect(share((a) => a.parts.eyewear)).toBeGreaterThan(0.5);
  });

  it("is still a room, not a fancy-dress party", () => {
    // The costume-box risk is about how OFTEN gear appears, which the bare-head
    // test covers. What this holds is the other half: plain pieces have not been
    // squeezed out, so the wall reads as a mix of people rather than a uniform.
    const wall = Array.from({ length: 60 }, (_, i) => crowdAvatar(`m${i}`));
    const plain = new Set<string>();
    wall.forEach((a) => {
      [a.parts.headgear, a.parts.eyewear, a.parts.collar].forEach((id) => {
        if (id && partTier(id) === "everyday") plain.add(id);
      });
    });
    expect(plain.size).toBeGreaterThanOrEqual(6);
  });

  it("keeps the pieces that are illegible at 50pt off the wall", () => {
    // The only exclusion left, and it is about the drawing rather than the
    // garment: these read as a smudge at crowd size.
    const worn = new Set(
      Array.from({ length: 60 }, (_, i) => {
        const p = crowdAvatar(`b${i}`).parts;
        return [p.headgear, p.eyewear, p.collar];
      }).flat(),
    );
    ["headgear.cap", "collar.bowtie", "eyewear.goggles"].forEach((id) =>
      expect(worn.has(id)).toBe(false),
    );
  });

  it("leaves the large majority of heads bare", () => {
    // At two-in-five a fifteen-tile wall came out with a hat on nearly every
    // head and read as a costume box. Hair should do the varying.
    const gear = Array.from({ length: 40 }, (_, i) =>
      crowdAvatar(`h${i}`).parts.headgear,
    );
    const bare = gear.filter((g) => g === null).length;
    expect(bare / gear.length).toBeGreaterThan(0.7);
  });

  it("never uses the cap — its brim reads as a visor and skews young", () => {
    const gear = Array.from({ length: 40 }, (_, i) => crowdAvatar(`c${i}`).parts.headgear);
    expect(gear).not.toContain("headgear.cap");
  });

  it("only ever uses parts the registry can actually draw", () => {
    // The pools are string literals, and an unknown part id renders NOTHING by
    // design (UserAvatar's layer table) — so a typo or a catalog rename does not
    // crash, it silently strips clothing off the wall. This is the check that
    // makes the literals safe.
    for (let i = 0; i < 60; i++) {
      const a = crowdAvatar(`r${i}`);
      for (const [slot, id] of Object.entries(a.parts)) {
        if (id === null) continue;
        expect(PART_REGISTRY[slot as AvatarSlot][id]).toBeDefined();
      }
    }
  });

  it("keeps glasses and beards to a minority of the crowd", () => {
    // Both slots exist to break up a uniform wall. Past roughly a third they
    // stop reading as variety and start reading as a uniform of their own.
    const crowd = Array.from({ length: 60 }, (_, i) => crowdAvatar(`v${i}`));
    const rate = (f: (a: AvatarManifest) => string | null) =>
      crowd.filter((a) => f(a) !== null).length / crowd.length;
    expect(rate((a) => a.parts.eyewear)).toBeGreaterThan(0.1);
    expect(rate((a) => a.parts.eyewear)).toBeLessThan(0.45);
    expect(rate((a) => a.parts.beard)).toBeGreaterThan(0.15);
    expect(rate((a) => a.parts.beard)).toBeLessThan(0.5);
  });
});

describe("illustrativeCrowd", () => {
  it("makes exactly the number of faces asked for", () => {
    expect(illustrativeCrowd(15).length).toBe(15);
    expect(illustrativeCrowd(0).length).toBe(0);
  });

  it("survives a nonsense size rather than throwing", () => {
    expect(illustrativeCrowd(-3)).toEqual([]);
  });

  it("gives neighbouring tiles different faces", () => {
    const out = illustrativeCrowd(2);
    expect(JSON.stringify(out[0])).not.toBe(JSON.stringify(out[1]));
  });

  it("is identical every time the screen mounts", () => {
    // Art that reshuffles under you reads as a glitch, so the wall must be
    // deterministic rather than randomised per render.
    expect(illustrativeCrowd(15)).toEqual(illustrativeCrowd(15));
  });

  it("fills a three-row wall with plenty of distinct looks", () => {
    const looks = new Set(illustrativeCrowd(15).map((a) => JSON.stringify(a)));
    expect(looks.size).toBeGreaterThanOrEqual(13);
  });

  it("varies the silhouette, not just the colours", () => {
    // At crowd size (small tiles, 0.3 opacity) detail resolves to nothing and
    // outline is the only variety the eye gets. A wall that varied only its
    // palettes would be thirty-three of the same shape in different colours.
    const wall = illustrativeCrowd(33);
    const distinct = (f: (a: AvatarManifest) => string | null) =>
      new Set(wall.map(f)).size;
    expect(distinct((a) => a.parts.collar)).toBeGreaterThanOrEqual(6);
    expect(distinct((a) => a.parts.hair)).toBeGreaterThanOrEqual(4);
    expect(distinct((a) => a.parts.beard)).toBeGreaterThanOrEqual(3);
    expect(distinct((a) => a.parts.eyewear)).toBeGreaterThanOrEqual(3);
  });
});
