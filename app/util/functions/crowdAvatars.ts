import {
  SKIN_TONES,
  HAIR_COLORS,
  BG_COLORS,
  COLLAR_COLORS,
} from "../../assets/avatar/registry";
import { DEFAULT_MANIFEST, type AvatarManifest } from "../../types/avatar";

/**
 * Faces for the Community wall.
 *
 * THESE ARE ILLUSTRATIONS, NOT PEOPLE. The wall is a picture of what practising
 * alongside others looks like — the same way a landing page shows a crowd. It
 * is generated on-device from a fixed seed, talks to no endpoint, and stands
 * for nobody in particular.
 *
 * That is precisely why the copy beside it must never imply otherwise: no
 * count, no "looking right now", no live dot. Decorative art is fine;
 * decorative art captioned as live data is the thing to avoid, and it is the
 * only rule this file has to hold.
 *
 * Every face is drawn ONLY from the palettes and parts the avatar studio
 * itself offers, so the crowd looks like it belongs to this product rather
 * than to a stock illustration set.
 */

/** Styles the studio ships. Kept as literals so a registry rename fails here
 *  loudly rather than silently rendering nothing (an unknown part id draws
 *  nothing by design — see UserAvatar's layer table). */
const HAIR_STYLES = [
  "hair.crop",
  "hair.swoop",
  "hair.curls",
  "hair.waves",
  "hair.long",
] as const;

const FACES = [
  "face.brand",
  "face.smile",
  "face.joy",
  "face.wink",
] as const;

const COLLARS = [
  "collar.cowl",
  "collar.scarf",
  "collar.mandarin",
  "collar.shawl",
  "collar.peterpan",
] as const;

/**
 * Mostly bare heads.
 *
 * Two rules here. The stage kits (tourist, explorer, cowboy, crown) are EARNED
 * by levelling, so they never appear — dressing an illustration in them would
 * imply progression nobody achieved.
 *
 * And the FREQUENCY matters as much as the list. At two-in-five, a fifteen-tile
 * wall came out with a hat on nearly every head and read as a costume box
 * rather than a room full of people. One in seven, beanie only: enough to break
 * up the silhouettes, rare enough that hair does the varying. The cap is gone —
 * at this size its brim reads as a visor and skews the whole wall young.
 */
const HEADGEAR = [
  null,
  null,
  null,
  null,
  null,
  null,
  "headgear.beanie",
] as const;

/** FNV-1a. Small, dependency-free, and well spread for short ASCII keys —
 *  neighbouring uuids must not land on neighbouring looks. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Independent draws from one seed — using `hash % n` for every slot would
 *  correlate the choices and produce visible families of near-identical tiles. */
function pick<T>(seed: string, salt: string, list: readonly T[]): T {
  return list[hash(`${seed}:${salt}`) % list.length];
}

/**
 * One illustrated face, stable for a given seed.
 *
 * Deterministic rather than random so the wall does not reshuffle on every
 * render or between app launches — it is a piece of art the screen owns, and
 * art that changes under you reads as a glitch.
 */
export function crowdAvatar(seed: string): AvatarManifest {
  return {
    version: 1,
    parts: {
      ...DEFAULT_MANIFEST.parts,
      face: pick(seed, "face", FACES),
      hair: pick(seed, "hair", HAIR_STYLES),
      headgear: pick(seed, "gear", HEADGEAR),
      collar: pick(seed, "collarPart", COLLARS),
    },
    colors: {
      skin: pick(seed, "skin", SKIN_TONES).hex,
      hair: pick(seed, "hairColor", HAIR_COLORS).hex,
      bg: pick(seed, "bg", BG_COLORS).hex,
      collar: pick(seed, "collarColor", COLLAR_COLORS).hex,
    },
  };
}

/**
 * A crowd of `size` illustrated faces.
 *
 * Index is part of the seed, so neighbouring tiles differ and the arrangement
 * is identical every time the screen mounts.
 */
export function illustrativeCrowd(size: number): AvatarManifest[] {
  return Array.from({ length: Math.max(0, size) }, (_, i) =>
    crowdAvatar(`crowd-${i}`),
  );
}
