import {
  SKIN_TONES,
  HAIR_COLORS,
  BG_COLORS,
  COLLAR_COLORS,
  PART_IDS,
} from "../../assets/avatar/registry";
import {
  DEFAULT_MANIFEST,
  type AvatarManifest,
  type AvatarSlot,
} from "../../types/avatar";

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
 * The wall is also the shop window for the wardrobe: it wears the whole avatar
 * kit. Every kit piece is free to wear, so what a face wears makes no claim
 * about any person. The honesty question was always the caption.
 *
 * Every face is drawn ONLY from the palettes and parts the avatar studio
 * itself offers, so the crowd looks like it belongs to this product rather
 * than to a stock illustration set.
 */

/**
 * What the crowd may wear: the whole kit, in a stable order.
 *
 * Derived rather than hand-listed, so the wall follows the catalog the moment a
 * part is added. Sorted so the wall is deterministic against catalog
 * REORDERING too, not just across renders.
 */
function showcase(slot: AvatarSlot): string[] {
  return PART_IDS[slot].filter((id) => !CROWD_EXCLUDE.has(id)).sort();
}

/**
 * Parts that are wrong at CROWD size.
 *
 * About the DRAWING rather than the garment: fine on your own avatar, wrong on a
 * wall of small tiles at low opacity where outline is all the eye gets.
 * Anything added here needs a reason you could point at on screen.
 */
const CROWD_EXCLUDE = new Set([
  // Opaque across both eyes, so the tile reads as faceless. On a wall whose
  // entire job is to look like a room of PEOPLE, one blank face is the loudest
  // thing on screen.
  "eyewear.sunglasses",
]);

/** Expressions. A room of open, friendly faces; the thinking and listening
 *  faces read as distracted at crowd size. */
const FACES = ["face.calm", "face.smile", "face.warm", "face.proud"] as const;

const HAIR_STYLES = showcase("hair");

/**
 * A pool where roughly `fill` of the draws land on a style and the rest on null.
 *
 * THE RATE IS THE DESIGN DECISION, so it is the argument: a blank COUNT only
 * encodes the intent while the style list stays the same length.
 */
function pool(fill: number, styles: readonly string[]): readonly (string | null)[] {
  const blanks = Math.max(0, Math.round((styles.length * (1 - fill)) / fill));
  return [...(Array(blanks).fill(null) as (string | null)[]), ...styles];
}

/** Collars are the one slot that is ALWAYS filled, so it carries most of the
 *  wall's variety. */
const COLLARS = showcase("collar");

/**
 * Mostly bare heads. At two-in-five a fifteen-tile wall came out with a hat on
 * nearly every head and read as a costume box rather than a room full of
 * people. Roughly one in five: enough to break up the silhouettes, rare enough
 * that hair does the varying.
 */
const HEADGEAR = pool(0.185, showcase("headgear"));

/** Facial hair — the cheapest real variety on a wall of faces. */
const BEARDS = pool(0.368, showcase("beard"));

/** Glasses on roughly a quarter of the crowd. */
const EYEWEAR = pool(0.357, showcase("eyewear"));

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
      beard: pick(seed, "beard", BEARDS),
      headgear: pick(seed, "gear", HEADGEAR),
      eyewear: pick(seed, "eyewear", EYEWEAR),
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
