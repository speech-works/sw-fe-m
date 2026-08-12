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
 * The wall is also the shop window for the wardrobe, which is why it wears the
 * good gear rather than the plain gear. That reverses an earlier rule in this
 * file, and the reasoning is worth keeping: the old version drew EVERYDAY parts
 * only, on the grounds that a stranger in earned gear implies progression
 * nobody made. Over-applied. These are illustrations, so dressing one in a
 * crown makes no claim about any person, and what the wall is wearing was never
 * the honesty question. The caption is.
 *
 * Every face is drawn ONLY from the palettes and parts the avatar studio
 * itself offers, so the crowd looks like it belongs to this product rather
 * than to a stock illustration set.
 */

/**
 * How much likelier a premium piece is than a plain one, in the slots where a
 * silhouette is the whole point.
 *
 * Two, not ten. The wall is advertising, but a wall of nothing but crowns and
 * witch hats reads as a costume box rather than as a room, which is the same
 * failure the headgear frequency below was tuned to avoid. Doubling the odds
 * puts the good gear on most of the heads that HAVE gear while leaving the
 * plain pieces in the mix.
 */
const PREMIUM_WEIGHT = 2;

/**
 * What the crowd may wear: the whole catalog, leaning premium.
 *
 * Derived rather than hand-listed. This used to be four hand-written id lists,
 * which drifted the moment anyone added a part — the wall was still wearing
 * five of twelve collars months after the rest shipped.
 *
 * Weighting is done by REPEATING ids in the pool rather than by branching in
 * the picker, so `pick` stays a plain uniform draw over a list and the odds are
 * something you can read off the data.
 *
 * Sorted so the wall is deterministic against registry REORDERING too, not just
 * across renders — `Object.keys` order is insertion order, and a tidy-up of the
 * registry would otherwise silently reshuffle every face on the screen.
 */
function showcase(slot: AvatarSlot, weight = PREMIUM_WEIGHT): string[] {
  const ids = Object.keys(PART_REGISTRY[slot])
    .filter((id) => !CROWD_EXCLUDE.has(id))
    .sort();
  return ids.flatMap((id) =>
    partTier(id) === "everyday" ? [id] : (Array(weight).fill(id) as string[]),
  );
}

/**
 * Parts that are wrong at CROWD size.
 *
 * The only exclusion list left, and it is about the DRAWING rather than the
 * garment: these are fine on your own avatar at 130pt and fail at 50pt, where
 * the tiles are small and sit at low opacity so outline is all the eye gets.
 * Anything added here needs a reason you could point at on screen.
 */
const CROWD_EXCLUDE = new Set([
  // The brim reads as a visor at this size and skews the whole wall young.
  "headgear.cap",
  // The knot collapses into a smudge at the throat and reads as a stain.
  "collar.bowtie",
  // Opaque across both eyes, so the tile reads as faceless. Fine on your own
  // avatar at 130pt, where it is obviously a pair of goggles; on a wall whose
  // entire job is to look like a room of PEOPLE, one blank face is the loudest
  // thing on screen. The daisy glasses beside it keep their eyes and stay.
  "eyewear.goggles",
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
 * A pool where roughly `fill` of the draws land on a style and the rest on null.
 *
 * THE RATE IS THE DESIGN DECISION, so it is the argument. This used to take a
 * blank COUNT, which encoded the same intent only while the style list stayed
 * the same length — and opening the wall to the whole catalog tripled the
 * headgear list, quietly taking bare heads from four in five to under a half.
 * The frequency tests caught it, which is the only reason it is not on the
 * screen right now.
 */
function pool(fill: number, styles: readonly string[]): readonly (string | null)[] {
  const blanks = Math.max(0, Math.round((styles.length * (1 - fill)) / fill));
  return [...(Array(blanks).fill(null) as (string | null)[]), ...styles];
}

/** Collars are the one slot that is ALWAYS filled, so it carries most of the
 *  wall's variety. Left unweighted: a premium lean here would show the same few
 *  fancy collars over and over rather than a room of different necklines. */
const COLLARS = showcase("collar", 1);

/**
 * Mostly bare heads.
 *
 * The frequency matters as much as the list. At two-in-five, a fifteen-tile wall
 * came out with a hat on nearly every head and read as a costume box rather than
 * a room full of people. Roughly one in five: enough to break up the
 * silhouettes, rare enough that hair does the varying. Unchanged by opening the
 * catalog — the wall shows BETTER gear, not more of it.
 */
const HEADGEAR = pool(0.185, showcase("headgear"));

/** Facial hair — the cheapest real variety on a wall of faces, because it
 *  changes the lower silhouette without adding a slot the eye has to read. */
const BEARDS = pool(0.368, showcase("beard"));

/** Glasses on roughly a quarter of the crowd — near enough to life to pass
 *  unnoticed, which is the goal. */
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
