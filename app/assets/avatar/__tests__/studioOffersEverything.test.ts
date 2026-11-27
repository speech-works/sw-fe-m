import fs from "fs";
import path from "path";
import { PART_IDS } from "../registry";
import type { AvatarSlot } from "../../../types/avatar";
import CATALOG from "../../../components/KitAvatar/kit/catalog.json";
import RESERVED_HINT from "../../../components/Pip/pip-app.json";
import { KIT_SHAPES } from "../../../components/KitAvatar/kitLook";

/**
 * Every part the avatar kit lets users wear must be offered in the Studio, and
 * nothing else.
 *
 * The Studio lists each slot as `PART_IDS.<slot>`. Reading the screen as TEXT
 * is deliberate: importing it would drag in the whole React Native component
 * tree for a check that is really about the screen and the catalog agreeing.
 */
const SCREEN = path.join(__dirname, "../../../screens/AvatarStudio/index.tsx");
const CAT: any = CATALOG;

const SLOTS: AvatarSlot[] = ["face", "hair", "beard", "headgear", "eyewear", "collar"];

describe("the Studio offers the whole kit", () => {
  const source = fs.readFileSync(SCREEN, "utf8");

  SLOTS.forEach((slot) => {
    it(`offers every ${slot} the kit has`, () => {
      expect(source).toContain(`ids={PART_IDS.${slot}}`);
      const kit = Object.keys(CAT.parts).filter((id) => CAT.parts[id].slot === slot);
      expect(PART_IDS[slot]).toEqual(kit);
      expect(PART_IDS[slot].length).toBeGreaterThan(0);
    });
  });

  it("offers no slot the kit has no parts for (no empty tabs)", () => {
    (["aura", "prop"] as AvatarSlot[]).forEach((slot) => expect(PART_IDS[slot]).toEqual([]));
    expect(source).not.toMatch(/key: "prop"/);
  });

  it("offers every blob shape, and every shape stays inside the avatar's box", () => {
    expect(source).toContain("ids={PART_IDS.bg}");
    expect(PART_IDS.bg).toEqual(KIT_SHAPES.map((x) => x.id));
    expect(PART_IDS.bg.length).toBeGreaterThan(10);
    // the square box (kitLook VIEW_BOX) and the live drawer's canvas (Pip VIEW): x -24..348, y -6..316 (with a margin)
    KIT_SHAPES.forEach((sh) => {
      const [x0, x1, y0, y1] = sh.box;
      expect(x0).toBeGreaterThanOrEqual(-18);
      expect(x1).toBeLessThanOrEqual(342);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(y1).toBeLessThanOrEqual(310);
      expect(sh.cut.startsWith("M")).toBe(true);
    });
  });

  it("offers the kit's own palettes", () => {
    expect(source).toContain("swatches={SKIN_TONES}");
    expect(source).toContain("swatches={HAIR_COLORS}");
    expect(source).toContain("swatches={COLLAR_COLORS}");
    expect(source).toContain("swatches={BG_COLORS}");
  });

  it("never lets a user build Pip: no reserved part is offered", () => {
    const reserved = Object.values<any>(CAT.parts).filter((p) => p.flags && p.flags.reserved);
    expect(reserved).toEqual([]);
    // Pip's own look ids (his jacket, his tie) are not in the user catalog
    const pipParts = new Set<string>();
    (RESERVED_HINT as any).looks.forEach((l: any) => Object.values<string>(l.look.parts).forEach((id) => id && pipParts.add(id)));
    const offered = new Set(SLOTS.flatMap((s) => PART_IDS[s]));
    const pipOnly = [...pipParts].filter((id) => !CAT.parts[id]);
    expect(pipOnly.length).toBeGreaterThan(0);
    pipOnly.forEach((id) => expect(offered.has(id)).toBe(false));
  });
});
