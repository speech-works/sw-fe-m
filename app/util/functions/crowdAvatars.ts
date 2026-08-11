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

/**
 * Collars carry most of the wall's variety, because they are the one slot whose
 * SILHOUETTE changes below the face — and at crowd size (tiles run about a
 * seventh of the viewport, at 0.3 opacity) silhouette and colour block are all
 * that survive. Piping, buttons and stitching resolve to nothing out there.
 *
 * So the list is chosen for outline, not for detail: a high tube, a knotted
 * scarf, a standing band, a deep V, round flaps, long points, a square frame,
 * crossed panels, a frill ring, a square sailor flap, wing tips. The bow tie is
 * the one deliberate omission — at this size its knot is a smudge at the throat
 * and it reads as a stain rather than as clothing.
 */
const COLLARS = [
  "collar.cowl",
  "collar.scarf",
  "collar.mandarin",
  "collar.shawl",
  "collar.peterpan",
  "collar.sailor",
  "collar.wing",
  "collar.barrymoore",
  "collar.square",
  "collar.wrap",
  "collar.cascade",
] as const;

/**
 * A pool where `blanks` empty slots sit beside the styles.
 *
 * The RATIO is the design decision on this screen, so it is written as a number
 * you can read and change rather than as a column of repeated nulls whose count
 * you have to trust yourself to have got right.
 */
function pool<T extends string>(
  blanks: number,
  styles: readonly T[],
): readonly (T | null)[] {
  return [...(Array(blanks).fill(null) as (T | null)[]), ...styles];
}

/**
 * Mostly bare heads.
 *
 * Two rules here. The stage kits (tourist, explorer, cowboy, crown) are EARNED
 * by levelling, so they never appear — dressing an illustration in them would
 * imply progression nobody achieved. Party hats, top hats and pirate hats are
 * free, and still excluded: they turn a room into a fancy-dress party.
 *
 * And the FREQUENCY matters as much as the list. At two-in-five, a fifteen-tile
 * wall came out with a hat on nearly every head and read as a costume box
 * rather than a room full of people. One in seven: enough to break up the
 * silhouettes, rare enough that hair does the varying. The cap is gone — at
 * this size its brim reads as a visor and skews the whole wall young.
 */
const HEADGEAR = pool(12, ["headgear.beanie", "headgear.headphones"]);

/**
 * Facial hair — the cheapest real variety on a wall of faces, because it
 * changes the lower silhouette without adding a slot the eye has to read.
 *
 * A third of the crowd. Long styles are included knowing the taller collars
 * will cover their lower half; that is what a collar does to a beard, and the
 * part that carries the shape (between mouth and collar) still shows.
 */
const BEARDS = pool(12, [
  "beard.stubble",
  "beard.mustache",
  "beard.goatee",
  "beard.full",
  "beard.handlebar",
  "beard.walrus",
]);

/**
 * Glasses on about a quarter of the crowd — near enough to life to pass
 * unnoticed, which is the goal.
 *
 * Sober frames only, on the hats' logic: heart, star and lime frames are free
 * to wear but make a crowd look like a party. Aviators are excluded for the
 * harder reason — they are EARNED at Voyager, and a stranger wearing them
 * implies progression nobody made.
 */
const EYEWEAR = pool(15, [
  "eyewear.round",
  "eyewear.square",
  "eyewear.wayfarer",
  "eyewear.roundshades",
  "eyewear.cateye",
]);

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
