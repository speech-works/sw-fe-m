import React from "react";
import { AvatarManifest, AvatarSlot, StageIndex } from "../../types/avatar";
import {
  ClassicHead,
  BrandFace,
  SmileFace,
  JoyFace,
  WinkFace,
  WowFace,
  HairCrop,
  HairSwoop,
  HairCurls,
  HairWaves,
  HairLong,
  BeardStubble,
  BeardMustache,
  BeardHandlebar,
  BeardHorseshoe,
  BeardWalrus,
  BeardGoatee,
  BeardFull,
  Beanie,
  BallCap,
  Headphones,
  TouristHat,
  ExplorerHat,
  CowboyHat,
  RoundGlasses,
  SquareGlasses,
  Wayfarers,
  RoundShades,
  LimeRounds,
  Aviators,
  MicProp,
  BookProp,
  CameraProp,
  CompassProp,
  LanternProp,
  FlagProp,
  // New free wardrobe (not level-gated)
  PartyHat,
  Crown,
  TopHat,
  PirateHat,
  HeartGlasses,
  StarGlasses,
  CatEye,
  Scarf,
  Bowtie,
  Cowl,
  PeterPanCollar,
  MandarinCollar,
  SailorCollar,
  WingCollar,
  ShawlCollar,
  // Collars built as real garments (garment + stand + leaves + detail)
  BarrymooreCollar,
  CascadeCollar,
  SquareCollar,
  WrapCollar,
  ClericalCollar,
  EtonCollar,
  HorseshoeCollar,
  ChelseaCollar,
  // Headgear + eyewear, second wave
  VikingHelm,
  NewsboyCap,
  HardHat,
  SantaHat,
  BandanaWrap,
  DaisyShades,
  ThreeDGlasses,
  OversizedShades,
  SkiGoggles,
  PartProps,
} from "./parts";

/**
 * The avatar catalog — FE-owned by design (the server stores manifests
 * verbatim and validates only structure). Lookup misses render NOTHING, so
 * removing an entry can never corrupt a stored manifest, and Phase E can add
 * granted part ids without touching the renderer.
 */

export type PartComponent = React.ComponentType<PartProps>;

export const PART_REGISTRY: Record<AvatarSlot, Record<string, PartComponent>> = {
  bg: {}, // solid colors.bg in MVP; reserved for patterned tiles
  aura: {}, // reserved — stage identity is worn gear, never a rendered aura
  head: { "head.classic": ClassicHead },
  face: {
    "face.brand": BrandFace,
    "face.smile": SmileFace,
    "face.joy": JoyFace,
    "face.wink": WinkFace,
    "face.wow": WowFace,
  },
  hair: {
    "hair.crop": HairCrop,
    "hair.swoop": HairSwoop,
    "hair.curls": HairCurls,
    "hair.waves": HairWaves,
    "hair.long": HairLong,
  },
  beard: {
    "beard.stubble": BeardStubble,
    "beard.mustache": BeardMustache,
    "beard.handlebar": BeardHandlebar,
    "beard.horseshoe": BeardHorseshoe,
    "beard.walrus": BeardWalrus,
    "beard.goatee": BeardGoatee,
    "beard.full": BeardFull,
  },
  headgear: {
    "headgear.beanie": Beanie,
    "headgear.cap": BallCap,
    "headgear.headphones": Headphones,
    "headgear.tourist": TouristHat,
    "headgear.explorer": ExplorerHat,
    "headgear.cowboy": CowboyHat,
    "headgear.party": PartyHat,
    "headgear.crown": Crown,
    "headgear.tophat": TopHat,
    "headgear.pirate": PirateHat,
    "headgear.viking": VikingHelm,
    "headgear.newsboy": NewsboyCap,
    "headgear.hardhat": HardHat,
    "headgear.santa": SantaHat,
    "headgear.bandana": BandanaWrap,
  },
  eyewear: {
    "eyewear.round": RoundGlasses,
    "eyewear.square": SquareGlasses,
    "eyewear.wayfarer": Wayfarers,
    "eyewear.roundshades": RoundShades,
    "eyewear.lime": LimeRounds,
    "eyewear.aviator": Aviators,
    "eyewear.heart": HeartGlasses,
    "eyewear.star": StarGlasses,
    "eyewear.cateye": CatEye,
    "eyewear.daisy": DaisyShades,
    "eyewear.threed": ThreeDGlasses,
    "eyewear.oversized": OversizedShades,
    "eyewear.goggles": SkiGoggles,
  },
  collar: {
    "collar.scarf": Scarf,
    "collar.bowtie": Bowtie,
    "collar.cowl": Cowl,
    "collar.peterpan": PeterPanCollar,
    "collar.mandarin": MandarinCollar,
    "collar.sailor": SailorCollar,
    "collar.wing": WingCollar,
    "collar.shawl": ShawlCollar,
    "collar.barrymoore": BarrymooreCollar,
    "collar.cascade": CascadeCollar,
    "collar.square": SquareCollar,
    "collar.wrap": WrapCollar,
    "collar.clerical": ClericalCollar,
    "collar.eton": EtonCollar,
    "collar.horseshoe": HorseshoeCollar,
    "collar.chelsea": ChelseaCollar,
  },
  prop: {
    "prop.mic": MicProp,
    "prop.book": BookProp,
    "prop.camera": CameraProp,
    "prop.compass": CompassProp,
    "prop.lantern": LanternProp,
    "prop.flag": FlagProp,
  },
};

/**
 * The journey gear: which stage EARNS which part. Absent id = free from the
 * start. Level is the ownership proof — reaching the stage grants the piece
 * forever (no server inventory; Phase E's granted items will layer real
 * inventory on top for non-stage rewards).
 */
export const EARN_STAGE: Record<string, StageIndex> = {
  "headgear.tourist": 0,
  "prop.camera": 0,
  "headgear.explorer": 1,
  "prop.compass": 1,
  "eyewear.aviator": 2,
  "prop.lantern": 3,
  "headgear.cowboy": 4,
  "prop.flag": 4,
};

/**
 * The catalog's three tiers.
 *
 * These exist because "which parts may an illustrated stranger wear?" was being
 * answered by two different rules wearing one name: a real one (earned gear
 * implies progression nobody made) and a taste one (a room full of party hats
 * stops reading as a room of people). The second was a judgment dressed up as a
 * principle. Tiering the catalog makes the crowd rule fall out of ownership
 * instead — the wall wears everyday parts, because those are the only ones
 * everybody owns.
 *
 *   journey    — earned by levelling. The tourist→guide story; see EARN_STAGE.
 *   collection — costume pieces. Free to wear TODAY: this tag records what they
 *                are, and deliberately does not gate them, because the unlock
 *                belongs to the Sparks economy rather than to the stage ladder.
 *                Level-gating them here would spend the same items twice, and
 *                would put a Santa hat on a narrative about becoming a guide.
 *   everyday   — everything else. Ordinary clothes, owned by everyone.
 */
export type PartTier = "journey" | "collection" | "everyday";

/** Costume pieces. Membership is the only judgment call in the tier system, so
 *  it is a list you can argue with rather than a rule buried in a filter. */
const COLLECTION_PARTS = new Set([
  "headgear.party",
  "headgear.crown",
  "headgear.tophat",
  "headgear.pirate",
  "headgear.viking",
  "headgear.santa",
  "headgear.hardhat",
  "eyewear.heart",
  "eyewear.star",
  "eyewear.daisy",
  "eyewear.threed",
  "eyewear.goggles",
  // Not a costume — a vocation. A stranger in one implies a calling the way
  // earned gear implies a level, which is the same honesty problem.
  "collar.clerical",
]);

export function partTier(partId: string): PartTier {
  if (partId in EARN_STAGE) return "journey";
  return COLLECTION_PARTS.has(partId) ? "collection" : "everyday";
}

/** Is this part wearable at this stage? Free parts always are. */
export function isPartEarned(partId: string, stage: StageIndex): boolean {
  const need = EARN_STAGE[partId];
  return need === undefined || stage >= need;
}

/**
 * Each stage's signature look — what the Achievements carousel dresses YOUR
 * avatar in, and the story the ladder tells: tourist → guide.
 */
export const STAGE_KITS: {
  headgear: string | null;
  eyewear: string | null;
  prop: string | null;
}[] = [
  { headgear: "headgear.tourist", eyewear: null, prop: "prop.camera" },
  { headgear: "headgear.explorer", eyewear: null, prop: "prop.compass" },
  { headgear: "headgear.explorer", eyewear: "eyewear.aviator", prop: null },
  { headgear: "headgear.explorer", eyewear: "eyewear.aviator", prop: "prop.lantern" },
  { headgear: "headgear.cowboy", eyewear: "eyewear.aviator", prop: "prop.flag" },
];

/** The user's avatar wearing a stage's kit (identity — skin/hair/backdrop —
 *  stays theirs; only the gear slots are overridden). */
export function manifestWithStageKit(
  manifest: AvatarManifest,
  stage: StageIndex,
): AvatarManifest {
  const kit = STAGE_KITS[stage];
  return {
    ...manifest,
    parts: {
      ...manifest.parts,
      headgear: kit.headgear,
      eyewear: kit.eyewear,
      prop: kit.prop,
    },
  };
}

// ── Color catalogs (hexes finalized by the D2 art spec) ─────────────────────

export const SKIN_TONES: { label: string; hex: string }[] = [
  { label: "Fair", hex: "#F5D5BC" },
  { label: "Light", hex: "#E8B98A" },
  { label: "Tan", hex: "#C68642" },
  { label: "Warm", hex: "#A56A3D" },
  { label: "Brown", hex: "#7A4A2B" },
  { label: "Deep", hex: "#4E3325" },
];

export const HAIR_COLORS: { label: string; hex: string }[] = [
  { label: "Black", hex: "#241E1A" },
  { label: "Brown", hex: "#4A362C" },
  { label: "Auburn", hex: "#7A4530" },
  { label: "Blonde", hex: "#C9A05A" },
  { label: "Grey", hex: "#9B9691" },
];

export const BG_COLORS: { label: string; hex: string }[] = [
  { label: "Ocean", hex: "#2E86AB" },
  { label: "Fern", hex: "#5BA88A" },
  { label: "Iris", hex: "#8A6FB0" },
  { label: "Clay", hex: "#C77D5A" },
  { label: "Slate", hex: "#4E5D6C" },
  { label: "Rose", hex: "#B0555F" },
];

/** Collar fabric colours — every collar recolors from ONE of these (the studio
 *  shows this row above the collar styles, like Hair). Secondary tones per
 *  collar are derived with shade(), so all six read on every style. */
export const COLLAR_COLORS: { label: string; hex: string }[] = [
  { label: "White", hex: "#EDEDF0" },
  { label: "Navy", hex: "#3A5A8C" },
  { label: "Burgundy", hex: "#8E3B49" },
  { label: "Forest", hex: "#3E7D63" },
  { label: "Charcoal", hex: "#3A3A42" },
  { label: "Camel", hex: "#C08A4E" },
];

/** Display names for wardrobe rows (registry keys are ids, not copy). */
export const PART_LABELS: Record<string, string> = {
  "face.brand": "Cheerful",
  "face.smile": "Soft smile",
  "face.joy": "Joy",
  "face.wink": "Wink",
  "face.wow": "Wow",
  "hair.crop": "Buzz cut",
  "hair.swoop": "Swoop",
  "hair.curls": "Curls",
  "hair.waves": "Waves",
  "hair.long": "Long",
  "beard.stubble": "Stubble",
  "beard.mustache": "Mustache",
  "beard.handlebar": "Handlebar",
  "beard.horseshoe": "Horseshoe",
  "beard.walrus": "Walrus",
  "beard.goatee": "Goatee",
  "beard.full": "Full beard",
  "headgear.beanie": "Beanie",
  "headgear.cap": "Cap",
  "headgear.headphones": "Headphones",
  "headgear.tourist": "Tourist hat",
  "headgear.explorer": "Explorer hat",
  "headgear.cowboy": "Star cowboy hat",
  "headgear.party": "Party hat",
  "headgear.crown": "Crown",
  "headgear.tophat": "Top hat",
  "headgear.pirate": "Pirate hat",
  "headgear.viking": "Viking helm",
  "headgear.newsboy": "Newsboy cap",
  "headgear.hardhat": "Hard hat",
  "headgear.santa": "Santa hat",
  "headgear.bandana": "Bandana",
  "eyewear.round": "Round",
  "eyewear.square": "Square",
  "eyewear.wayfarer": "Wayfarers",
  "eyewear.roundshades": "Round shades",
  "eyewear.lime": "Lime rounds",
  "eyewear.aviator": "Aviators",
  "eyewear.heart": "Heart glasses",
  "eyewear.star": "Star shades",
  "eyewear.cateye": "Cat-eye",
  "eyewear.daisy": "Daisy shades",
  "eyewear.threed": "3D glasses",
  "eyewear.oversized": "Oversized",
  "eyewear.goggles": "Ski goggles",
  "collar.scarf": "Knit scarf",
  "collar.bowtie": "Bow tie",
  "collar.cowl": "Turtleneck",
  "collar.peterpan": "Peter Pan",
  "collar.mandarin": "Mandarin",
  "collar.sailor": "Sailor",
  "collar.wing": "Wing tip",
  "collar.shawl": "Shawl",
  "collar.barrymoore": "Point collar",
  "collar.cascade": "Cascade frill",
  "collar.square": "Square neck",
  "collar.wrap": "Wrap",
  "collar.clerical": "Clerical",
  "collar.eton": "Eton",
  "collar.horseshoe": "Horseshoe",
  "collar.chelsea": "Chelsea",
  "prop.mic": "Mic",
  "prop.book": "Book",
  "prop.camera": "Camera",
  "prop.compass": "Compass",
  "prop.lantern": "Lantern",
  "prop.flag": "Summit flag",
};

/** Stage names for earn hints ("Reach Pathfinder"). Titles are server-authored
 *  at runtime; this mirror is only for wardrobe lock hints. */
export const STAGE_NAMES = ["Seeker", "Pathfinder", "Voyager", "Catalyst", "North Star"] as const;
