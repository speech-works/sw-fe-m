import React from "react";
import { AvatarManifest, AvatarSlot, StageIndex } from "../../types/avatar";
import {
  ClassicHead,
  BrandFace,
  HairCrop,
  HairSwoop,
  HairCurls,
  HairWaves,
  Beanie,
  BallCap,
  Headphones,
  TouristHat,
  ExplorerHat,
  ExplorerHatStar,
  RoundGlasses,
  SquareGlasses,
  Aviators,
  MicProp,
  BookProp,
  CameraProp,
  CompassProp,
  LanternProp,
  FlagProp,
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
  face: { "face.brand": BrandFace },
  hair: {
    "hair.crop": HairCrop,
    "hair.swoop": HairSwoop,
    "hair.curls": HairCurls,
    "hair.waves": HairWaves,
  },
  headgear: {
    "headgear.beanie": Beanie,
    "headgear.cap": BallCap,
    "headgear.headphones": Headphones,
    "headgear.tourist": TouristHat,
    "headgear.explorer": ExplorerHat,
    "headgear.explorer-star": ExplorerHatStar,
  },
  eyewear: {
    "eyewear.round": RoundGlasses,
    "eyewear.square": SquareGlasses,
    "eyewear.aviator": Aviators,
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
  "headgear.explorer-star": 4,
  "prop.flag": 4,
};

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
  { headgear: "headgear.explorer-star", eyewear: "eyewear.aviator", prop: "prop.flag" },
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

/** Display names for wardrobe rows (registry keys are ids, not copy). */
export const PART_LABELS: Record<string, string> = {
  "hair.crop": "Crop",
  "hair.swoop": "Swoop",
  "hair.curls": "Curls",
  "hair.waves": "Waves",
  "headgear.beanie": "Beanie",
  "headgear.cap": "Cap",
  "headgear.headphones": "Headphones",
  "headgear.tourist": "Tourist hat",
  "headgear.explorer": "Explorer hat",
  "headgear.explorer-star": "Starred explorer hat",
  "eyewear.round": "Round",
  "eyewear.square": "Square",
  "eyewear.aviator": "Aviators",
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
