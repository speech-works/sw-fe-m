import React from "react";
import {
  AvatarManifest,
  AvatarSlot,
  StageIndex,
  STAGE_MIN_LEVELS,
} from "../../types/avatar";
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
  // Phase 0: backdrops (the bg slot's first occupants), props, hair, faces
  BgHearts,
  BgEggs,
  BgCow,
  BgMonstera,
  BgStars,
  BgBolts,
  BgDots,
  BgChecks,
  BgSwirl,
  BgBlob,
  BgWavyBands,
  MugProp,
  PlantProp,
  CatProp,
  TrophyProp,
  PlaneProp,
  BalloonProp,
  SkateboardProp,
  DuckProp,
  DogProp,
  IceCreamProp,
  ControllerProp,
  SunflowerProp,
  HairAfro,
  HairBraids,
  HairPonytail,
  HairSpaceBuns,
  HairBob,
  HairPigtails,
  ProudFace,
  LaughFace,
  SpeakingFace,
  // Phase 1: the rest of the tailoring set
  PoloCollar,
  JohnnyCollar,
  MediciCollar,
  PuritanCollar,
  ButtonDownCollar,
  PinCollar,
  Beret,
  WitchHat,
  Sombrero,
  Deerstalker,
  GraduationCap,
  ChefToque,
  SailorCap,
  PoliceCap,
  AviatorCap,
  Browline,
  Rimless,
  HexFrames,
  PixelShades,
  LeopardCatEye,
  Monocle,
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
  bg: {
    // Patterns drawn OVER `colors.bg`. Empty slot = the flat colour, which is
    // still the default; a backdrop is an addition, never a replacement.
    "bg.hearts": BgHearts,
    "bg.eggs": BgEggs,
    "bg.cow": BgCow,
    "bg.monstera": BgMonstera,
    "bg.stars": BgStars,
    "bg.bolts": BgBolts,
    "bg.dots": BgDots,
    "bg.checks": BgChecks,
    "bg.swirl": BgSwirl,
    "bg.blob": BgBlob,
    "bg.wavybands": BgWavyBands,
  },
  aura: {}, // reserved — stage identity is worn gear, never a rendered aura
  head: { "head.classic": ClassicHead },
  face: {
    "face.brand": BrandFace,
    "face.smile": SmileFace,
    "face.joy": JoyFace,
    "face.wink": WinkFace,
    "face.wow": WowFace,
    "face.proud": ProudFace,
    "face.laugh": LaughFace,
    "face.speaking": SpeakingFace,
  },
  hair: {
    "hair.crop": HairCrop,
    "hair.swoop": HairSwoop,
    "hair.curls": HairCurls,
    "hair.waves": HairWaves,
    "hair.long": HairLong,
    "hair.afro": HairAfro,
    "hair.braids": HairBraids,
    "hair.ponytail": HairPonytail,
    "hair.spacebuns": HairSpaceBuns,
    "hair.bob": HairBob,
    "hair.pigtails": HairPigtails,
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
    "headgear.beret": Beret,
    "headgear.witch": WitchHat,
    "headgear.sombrero": Sombrero,
    "headgear.deerstalker": Deerstalker,
    "headgear.grad": GraduationCap,
    "headgear.chef": ChefToque,
    "headgear.sailorcap": SailorCap,
    "headgear.police": PoliceCap,
    "headgear.aviatorcap": AviatorCap,
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
    "eyewear.browline": Browline,
    "eyewear.rimless": Rimless,
    "eyewear.hex": HexFrames,
    "eyewear.pixel": PixelShades,
    "eyewear.leopard": LeopardCatEye,
    "eyewear.monocle": Monocle,
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
    "collar.polo": PoloCollar,
    "collar.johnny": JohnnyCollar,
    "collar.medici": MediciCollar,
    "collar.puritan": PuritanCollar,
    "collar.buttondown": ButtonDownCollar,
    "collar.pin": PinCollar,
  },
  prop: {
    "prop.mic": MicProp,
    "prop.book": BookProp,
    "prop.camera": CameraProp,
    "prop.compass": CompassProp,
    "prop.lantern": LanternProp,
    "prop.flag": FlagProp,
    "prop.mug": MugProp,
    "prop.plant": PlantProp,
    "prop.cat": CatProp,
    "prop.trophy": TrophyProp,
    "prop.plane": PlaneProp,
    "prop.balloon": BalloonProp,
    "prop.skateboard": SkateboardProp,
    "prop.duck": DuckProp,
    "prop.dog": DogProp,
    "prop.icecream": IceCreamProp,
    "prop.controller": ControllerProp,
    "prop.sunflower": SunflowerProp,
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
  // Phase 0 art. Backdrops and props are the reward ladder's backbone; hair
  // and expressions are identity and deliberately stay everyday.
  "bg.hearts",
  "bg.eggs",
  "bg.cow",
  "bg.monstera",
  "bg.stars",
  "bg.bolts",
  "bg.dots",
  "bg.checks",
  "bg.swirl",
  "bg.blob",
  "bg.wavybands",
  "prop.mug",
  "prop.plant",
  "prop.cat",
  "prop.trophy",
  "prop.plane",
  "prop.balloon",
  "prop.skateboard",
  "prop.duck",
  "prop.dog",
  "prop.icecream",
  "prop.controller",
  "prop.sunflower",
  // Phase 1 costume pieces. Polo/Johnny/Button-down/Pin, Beret, Browline,
  // Rimless and Hex are ordinary clothes and stay everyday.
  "collar.medici",
  "collar.puritan",
  "headgear.witch",
  "headgear.sombrero",
  "headgear.deerstalker",
  "headgear.grad",
  "headgear.chef",
  "headgear.sailorcap",
  "headgear.police",
  "headgear.aviatorcap",
  "eyewear.pixel",
  "eyewear.leopard",
  "eyewear.monocle",
]);

export function partTier(partId: string): PartTier {
  if (partId in EARN_STAGE) return "journey";
  return COLLECTION_PARTS.has(partId) ? "collection" : "everyday";
}

/**
 * The level at which each collection piece unlocks.
 *
 * ONE number per part, and one axis for the whole catalog — the journey gear
 * folds into the same scale below rather than keeping a second mechanism, since
 * a stage is already just a band of levels.
 *
 * The shape of this table is the design. Levels cost `18(level-1)²` XP against
 * a hard cap of 800 XP/week, so even a user who maxes out every week takes ~8
 * weeks to reach 20, ~19 to reach 30 and a year to reach 50. Almost everything
 * therefore sits in **3–25**, where people actually are: something new lands
 * every single level from 3 to 25, and only a handful of trophies live above
 * it. Gear parked at level 40 is gear nobody wears.
 *
 * The first unlock is level 3 on purpose — early enough that the mechanism is
 * discovered in the first session or two rather than guessed at.
 *
 * Slots are interleaved so consecutive levels rarely give the same kind of
 * thing twice; a run of five hats reads as one reward, not five.
 */
export const UNLOCK_LEVEL: Record<string, number> = {
  "bg.dots": 3,
  "headgear.party": 4,
  "prop.mug": 4,
  "eyewear.heart": 5,
  "bg.checks": 6,
  "prop.plant": 6,
  "eyewear.star": 7,
  "headgear.hardhat": 8,
  "bg.stars": 8,
  "prop.duck": 9,
  "eyewear.daisy": 10,
  "bg.wavybands": 10,
  "headgear.pirate": 11,
  "prop.cat": 11,
  "eyewear.threed": 12,
  "bg.swirl": 13,
  "prop.skateboard": 13,
  "headgear.viking": 14,
  "bg.bolts": 15,
  "prop.dog": 15,
  "eyewear.goggles": 16,
  "headgear.tophat": 17,
  "bg.hearts": 17,
  "prop.icecream": 18,
  "headgear.sailorcap": 19,
  "bg.eggs": 19,
  "prop.controller": 20,
  "eyewear.pixel": 20,
  "headgear.chef": 21,
  "collar.medici": 21,
  "bg.cow": 22,
  "prop.sunflower": 22,
  "headgear.sombrero": 23,
  "eyewear.leopard": 23,
  "bg.monstera": 24,
  "prop.balloon": 24,
  "headgear.santa": 25,
  "collar.puritan": 25,
  // Past here the curve slows sharply, so these are milestones, not a drip.
  "headgear.deerstalker": 27,
  "bg.blob": 27,
  "prop.plane": 29,
  "eyewear.monocle": 29,
  "headgear.witch": 31,
  "collar.clerical": 31,
  "prop.trophy": 34,
  "headgear.police": 37,
  "headgear.aviatorcap": 40,
  "headgear.grad": 45,
  "headgear.crown": 50,
};

/**
 * What level does this part need? 1 means free.
 *
 * Journey gear resolves through the stage table rather than being listed twice
 * — `EARN_STAGE` stays the source of truth for the tourist→guide story, and
 * this turns its stage into the level that stage begins at.
 */
export function partUnlockLevel(partId: string): number {
  const stage = EARN_STAGE[partId];
  if (stage !== undefined) return STAGE_MIN_LEVELS[stage];
  return UNLOCK_LEVEL[partId] ?? 1;
}

/** Can this person wear this part yet? */
export function isPartUnlocked(partId: string, level: number): boolean {
  return level >= partUnlockLevel(partId);
}

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

/**
 * Which slot does a part live in? Built from the registry rather than split off
 * the id's prefix — the prefix convention holds today, but a lookup can't be
 * broken by renaming one part.
 */
const SLOT_OF_PART: Record<string, AvatarSlot> = (() => {
  const map: Record<string, AvatarSlot> = {};
  (Object.keys(PART_REGISTRY) as AvatarSlot[]).forEach((slot) => {
    Object.keys(PART_REGISTRY[slot]).forEach((id) => {
      map[id] = slot;
    });
  });
  return map;
})();

export function slotOfPart(partId: string): AvatarSlot | null {
  return SLOT_OF_PART[partId] ?? null;
}

/**
 * Everything that became wearable by crossing from `fromLevel` to `toLevel`.
 *
 * Half-open on the low side: a part needing exactly `fromLevel` was already
 * wearable before the jump, so announcing it would be a lie. Multi-level jumps
 * (possible — one practice can carry more than one level) collect every rung
 * they passed, which is why this takes a range rather than a single level.
 *
 * Returned in unlock order so the reveal reads as a ladder, with the id as a
 * tiebreaker: `Object.keys` order is the authoring order of the registry, and
 * a reward list that reshuffles between two identical level-ups looks like a
 * bug even though nobody could say what changed.
 */
export function partsUnlockedBetween(fromLevel: number, toLevel: number): string[] {
  if (!(toLevel > fromLevel)) return [];
  const slots = Object.keys(PART_REGISTRY) as AvatarSlot[];
  return slots
    .flatMap((slot) => Object.keys(PART_REGISTRY[slot]))
    .filter((id) => {
      const need = partUnlockLevel(id);
      return need > fromLevel && need <= toLevel;
    })
    .sort((a, b) => partUnlockLevel(a) - partUnlockLevel(b) || a.localeCompare(b));
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
  { label: "Sky", hex: "#5AA9E6" },
  { label: "Mint", hex: "#4FBFA0" },
  { label: "Lilac", hex: "#A88BD8" },
  { label: "Coral", hex: "#E8785B" },
  { label: "Gold", hex: "#D9A93F" },
  { label: "Teal", hex: "#2F8F8A" },
  { label: "Plum", hex: "#7A4A6E" },
  { label: "Sand", hex: "#C9A87C" },
  { label: "Forest", hex: "#3E7D4E" },
  { label: "Ink", hex: "#2E3247" },
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
  "face.proud": "Proud",
  "face.laugh": "Laughing",
  "face.speaking": "Speaking",
  "hair.crop": "Buzz cut",
  "hair.swoop": "Swoop",
  "hair.curls": "Curls",
  "hair.waves": "Waves",
  "hair.long": "Long",
  "hair.afro": "Afro",
  "hair.braids": "Braids",
  "hair.ponytail": "Ponytail",
  "hair.spacebuns": "Space buns",
  "hair.bob": "Bob",
  "hair.pigtails": "Pigtails",
  "beard.stubble": "Stubble",
  "beard.mustache": "Mustache",
  "beard.handlebar": "Handlebar",
  "beard.horseshoe": "Horseshoe",
  "beard.walrus": "Walrus",
  "beard.goatee": "Goatee",
  "beard.full": "Full beard",
  "headgear.beanie": "Beanie",
  "headgear.cap": "Cap",
  "headgear.headphones": "Headset",
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
  "headgear.beret": "Beret",
  "headgear.witch": "Witch hat",
  "headgear.sombrero": "Sombrero",
  "headgear.deerstalker": "Sherlock",
  "headgear.grad": "Grad cap",
  "headgear.chef": "Chef toque",
  "headgear.sailorcap": "Sailor cap",
  "headgear.police": "Police cap",
  "headgear.aviatorcap": "Aviator cap",
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
  "eyewear.browline": "Browline",
  "eyewear.rimless": "Rimless",
  "eyewear.hex": "Hex frames",
  "eyewear.pixel": "Pixel shades",
  "eyewear.leopard": "Leopard",
  "eyewear.monocle": "Monocle",
  "collar.scarf": "Knit scarf",
  "collar.bowtie": "Bow tie",
  "collar.cowl": "Roll neck",
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
  "collar.polo": "Polo",
  "collar.johnny": "Johnny",
  "collar.medici": "Medici",
  "collar.puritan": "Puritan",
  "collar.buttondown": "Buttoned",
  "collar.pin": "Pin collar",
  "prop.mic": "Mic",
  "prop.book": "Book",
  "prop.camera": "Camera",
  "prop.compass": "Compass",
  "prop.lantern": "Lantern",
  "prop.flag": "Summit flag",
  "prop.mug": "Coffee mug",
  "prop.plant": "Potted plant",
  "prop.cat": "Cat",
  "prop.trophy": "Trophy",
  "prop.plane": "Paper plane",
  "prop.balloon": "Balloon",
  "prop.skateboard": "Skate deck",
  "prop.duck": "Rubber duck",
  "prop.dog": "Dog",
  "prop.icecream": "Ice cream",
  "prop.controller": "Gamepad",
  "prop.sunflower": "Sunflower",
  "bg.hearts": "Hearts",
  "bg.eggs": "Eggs",
  "bg.cow": "Cow print",
  "bg.monstera": "Monstera",
  "bg.stars": "Stars",
  "bg.bolts": "Bolts",
  "bg.dots": "Dots",
  "bg.checks": "Checks",
  "bg.swirl": "Retro swirl",
  "bg.blob": "Blobs",
  "bg.wavybands": "Wavy bands",
};

/** Stage names for earn hints ("Reach Pathfinder"). Titles are server-authored
 *  at runtime; this mirror is only for wardrobe lock hints. */
export const STAGE_NAMES = ["Seeker", "Pathfinder", "Voyager", "Catalyst", "North Star"] as const;
