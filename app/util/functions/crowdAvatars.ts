import {
  SKIN_TONES,
  HAIR_COLORS,
  BG_COLORS,
  COLLAR_COLORS,
  PART_REGISTRY,
  partTier,
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
 * Every face is drawn ONLY from the palettes and parts the avatar studio
 * itself offers, so the crowd looks like it belongs to this product rather
 * than to a stock illustration set.
 */

/**
 * What the crowd may wear: the catalog's EVERYDAY tier, and nothing else.
 *
 * This used to be four hand-written id lists, which drifted the moment anyone
 * added a part — the wall was still wearing five of twelve collars months after
 * the rest shipped. Deriving it means a new everyday part reaches the wall by
 * being everyday, and the two tiers that must never appear here are excluded by
 * what they ARE rather than by being remembered:
 *
 *   journey gear implies a level the stranger never reached;
 *   collection pieces imply ownership they were never granted.
 *
 * Sorted so the wall is deterministic against registry REORDERING too, not just
 * across renders — `Object.keys` order is insertion order, and a tidy-up of the
 * registry would otherwise silently reshuffle every face on the screen.
 */
function everyday(slot: AvatarSlot): string[] {
  return Object.keys(PART_REGISTRY[slot])
    .filter((id) => partTier(id) === "everyday" && !CROWD_EXCLUDE.has(id))
    .sort();
}

/**
 * Everyday parts that are still wrong at CROWD size.
 *
 * A separate judgment from the tier, and a much narrower one: these are fine on
 * your own avatar at 130pt and fail at 50pt, so the reason is always about the
 * drawing rather than about the garment.
 */
const CROWD_EXCLUDE = new Set([
  // The brim reads as a visor at this size and skews the whole wall young.
  "headgear.cap",
  // The knot collapses into a smudge at the throat and reads as a stain.
  "collar.bowtie",
]);

/** Expressions. Not tiered — a face is not clothing. `wow` is left out: a room
 *  of surprised faces reads as alarm rather than as company. */
const FACES = ["face.brand", "face.smile", "face.joy", "face.wink"] as const;

const HAIR_STYLES = [
  "hair.crop",
  "hair.swoop",
  "hair.curls",
  "hair.waves",
  "hair.long",
] as const;

/**
 * A pool where `blanks` empty slots sit beside the styles.
 *
 * The RATIO is the design decision on this screen, so it is written as a number
 * you can read and change rather than as a column of repeated nulls whose count
 * you have to trust yourself to have got right.
 */
function pool(blanks: number, styles: readonly string[]): readonly (string | null)[] {
  return [...(Array(blanks).fill(null) as (string | null)[]), ...styles];
}

const COLLARS = everyday("collar");

/**
 * Mostly bare heads.
 *
 * The frequency matters as much as the list. At two-in-five, a fifteen-tile wall
 * came out with a hat on nearly every head and read as a costume box rather than
 * a room full of people. Roughly one in seven: enough to break up the
 * silhouettes, rare enough that hair does the varying.
 */
const HEADGEAR = pool(22, everyday("headgear"));

/** Facial hair — the cheapest real variety on a wall of faces, because it
 *  changes the lower silhouette without adding a slot the eye has to read. */
const BEARDS = pool(12, everyday("beard"));

/** Glasses on roughly a quarter of the crowd — near enough to life to pass
 *  unnoticed, which is the goal. */
const EYEWEAR = pool(18, everyday("eyewear"));

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
