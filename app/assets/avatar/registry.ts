import type { AvatarSlot } from "../../types/avatar";
import { STAGE_MIN_LEVELS } from "../../types/avatar";
import { DEFAULT_SHAPE, KIT_PALETTES, KIT_PARTS, KIT_SHAPES, kitLabel, kitSlotOf } from "../../components/KitAvatar/kitLook";

/**
 * The avatar catalog: the layered avatar kit's parts (components/KitAvatar,
 * generated from sw-characters). The server stores manifests verbatim and
 * validates only structure; an unknown id draws the kit default for its slot.
 *
 * Every part is free to wear. The old level ladder (travel gear by stage,
 * collection pieces by level, props, patterned backdrops) is gone with the old
 * part set (founder, 2026-11-27) and can come back as kit parts later.
 */

/** The part ids the Studio offers, per slot. Empty for slots with no kit parts. bg = the blob shapes. */
export const PART_IDS: Record<AvatarSlot, string[]> = {
  bg: KIT_SHAPES.map((x) => x.id),
  aura: [],
  head: ["head.classic"],
  face: KIT_PARTS.face,
  hair: KIT_PARTS.hair,
  beard: KIT_PARTS.beard,
  headgear: KIT_PARTS.headgear,
  eyewear: KIT_PARTS.eyewear,
  collar: KIT_PARTS.collar,
  prop: [],
};

/**
 * Display names for the Studio's cells. The kit's own names are descriptions
 * ("Long braids, ending above the shoulders line"); a 96pt cell needs short
 * names (partLabels.test.ts). A part missing here falls back to the kit name.
 */
const SHORT: Record<string, string> = {
  "face.calm": "Calm",
  "face.smile": "Smile",
  "face.laugh": "Laugh",
  "face.proud": "Proud",
  "face.curious": "Curious",
  "face.listening": "Listening",
  "face.thinking": "Thinking",
  "face.warm": "Warm",
  "hair.crop": "Short crop",
  "hair.sidepart": "Side part",
  "hair.swoop": "Swoop",
  "hair.quiff": "Quiff",
  "hair.curly": "Short curls",
  "hair.coily": "Coily",
  "hair.waves": "Long waves",
  "hair.bob": "Bob",
  "hair.braids": "Long braids",
  "hair.pigtails": "Pigtails",
  "hair.longwaves": "Full waves",
  "hair.bobside": "Side bob",
  "hair.boxbraids": "Box braids",
  "hair.tallcurls": "Tall curls",
  "hair.coilybig": "Big coily",
  "hair.roundcurls": "Round curls",
  "hair.tightcurls": "Tight curls",
  "hair.fullswoop": "Full swoop",
  "hair.sweptquiff": "Swept quiff",
  "hair.pigtailbows": "Bow pigtails",
  "hair.curlytemples": "Curly sides",
  "hair.croptemples": "Light sides",
  "hair.temples": "Side tufts",
  "hair.braidsshort": "Short braids",
  "beard.full": "Full beard",
  "beard.stubble": "Stubble",
  "beard.moustache": "Mustache",
  "beard.stubblestache": "Stubble, mustache",
  "headgear.turban": "Turban",
  "headgear.beanie": "Beanie",
  "headgear.beret": "Beret",
  "headgear.cap": "Work cap",
  "headgear.newsboy": "Newsboy cap",
  "headgear.visor": "Visor",
  "headgear.headset": "Mic headset",
  "headgear.headphones": "Headset",
  "headgear.bandana": "Bandana",
  "headgear.headscarf": "Headscarf",
  "headgear.postal": "Postal cap",
  "headgear.headband": "Headband",
  "headgear.ribbed": "Ribbed beanie",
  "headgear.sunvisor": "Tall visor",
  "headgear.callheadset": "Call headset",
  "headgear.overear": "Over-ear set",
  "headgear.newsboypeak": "Two-tone cap",
  "headgear.flatcap": "Flat cap",
  "headgear.sunhat": "Sun hat",
  "headgear.cowboy": "Cowboy hat",
  "headgear.capheadset": "Cap, headset",
  "headgear.studiophones": "Studio set",
  "eyewear.round": "Round",
  "eyewear.cateye": "Cat-eye",
  "eyewear.star": "Star",
  "eyewear.square": "Square",
  "eyewear.sunglasses": "Shades",
  "eyewear.cateyebold": "Bold cat-eye",
  "collar.crew": "Crew tee",
  "collar.mandarin": "Mandarin",
  "collar.peterpan": "Peter Pan",
  "collar.rounddress": "Round dress",
  "collar.sailor": "Sailor",
  "collar.polo": "Polo",
  "collar.notched": "Jacket",
  "collar.shawl": "Shawl knit",
  "collar.rollneck": "Roll neck",
  "collar.scarf": "Scarf",
  "collar.jackettie": "Jacket, tie",
  "collar.bowcardigan": "Bow cardigan",
  "collar.chunky": "Chunky knit",
  "collar.zipjacket": "Zip jacket",
  "collar.cardigan": "Cardigan",
  "collar.wrapjacket": "Wrap jacket",
  "collar.piped": "Piped polo",
  "collar.suittie": "Suit and tie",
  "collar.jacketround": "Jacket, tee",
  "collar.postaljacket": "Postal coat",
  "collar.neckerchief": "Neck scarf",
};

/** Display names for wardrobe cells (part ids are ids, not copy). */
export const PART_LABELS: Record<string, string> = (() => {
  const out: Record<string, string> = Object.fromEntries(KIT_SHAPES.map((x) => [x.id, x.label]));
  (Object.keys(PART_IDS) as AvatarSlot[]).forEach((slot) => {
    if (slot === "head" || slot === "bg") return;
    PART_IDS[slot].forEach((id) => {
      out[id] = SHORT[id] ?? kitLabel(id);
    });
  });
  return out;
})();

/** Which slot does a part live in? null for an id the kit does not know. */
export function slotOfPart(partId: string): AvatarSlot | null {
  return PART_IDS.bg.includes(partId) ? "bg" : kitSlotOf(partId);
}

/** What a slot shows when the manifest leaves it empty and the slot is never empty on screen (the blob shape). */
export const SLOT_FALLBACK: Partial<Record<AvatarSlot, string>> = { bg: DEFAULT_SHAPE };

/**
 * Did this level-up cross into a new stage?
 *
 * The one signal that separates a routine level from a chapter change. Early
 * levels are cheap (`18(level-1)²` XP against an 800/week cap puts five or six
 * of them in a committed user's first week), so the celebration has to have
 * somewhere bigger to go, and this is the line it goes on.
 */
export function stageCrossedBetween(fromLevel: number, toLevel: number): boolean {
  if (!(toLevel > fromLevel)) return false;
  // Stage 0 opens at level 1, which nobody levels UP into.
  return STAGE_MIN_LEVELS.some((min) => min > 1 && min > fromLevel && min <= toLevel);
}

// ── Colour catalogs: the kit's palettes ─────────────────────────────────────

export const SKIN_TONES = KIT_PALETTES.skin;
export const HAIR_COLORS = KIT_PALETTES.hair;
export const BG_COLORS = KIT_PALETTES.bg;
/** Collar fabric colours: every collar recolours from one of these. */
export const COLLAR_COLORS = KIT_PALETTES.collar;
