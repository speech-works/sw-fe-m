/**
 * The room's camera.
 *
 * The Community hero is a crowd you are standing IN, not a mosaic you are
 * looking at, and the only thing that produces that reading is perspective:
 * tiles grow as they come toward you and the air between you and the back of
 * the room gets thicker. Both are pure arithmetic, so they live here where they
 * can be tested without mounting fifty SVGs.
 *
 * Kept separate from the component for a second reason: tile COUNT is the whole
 * performance story on this screen (every tile is an SVG avatar), and a
 * regression in these numbers is invisible in a screenshot but very visible on a
 * mid-range Android.
 */

/**
 * Size of the furthest band, as a fraction of the viewport width — about seven
 * and a half tiles across at the back of the room.
 *
 * This is the perf dial, and it has to be RELATIVE. A fixed 52pt gives ~33
 * tiles on a phone and 103 on a large tablet, because a bigger screen simply
 * fits more of them; expressing it as a fraction holds the count near 33 on
 * every viewport and, more importantly, keeps the crowd the same density
 * everywhere instead of turning into a fine mosaic on big screens — which is
 * exactly the aerial look the perspective exists to destroy.
 */
const BACK_FRACTION = 1 / 7.5;

/** Floor for very narrow windows, where the fraction would produce a swarm of
 *  tiny tiles and a dozen bands. */
const MIN_BACK_SIZE = 44;

/** Each band is 20% larger than the one behind it. */
const GROWTH = 1.2;

/** Air between tiles. Matches the flat wall's separation at the same scale. */
export const GAP = 5;

/**
 * Stop generating bands past this fraction of the screen.
 *
 * The scrim is ~0.9 opaque by 72% and solid canvas by 84%, so tiles below this
 * line cost a full SVG each and paint nothing. Anything that changes the scrim
 * ramp has to change this with it.
 */
const FLOOR = 0.78;

/**
 * Where the CENTRE of the subject pair sits, as a fraction of screen height.
 *
 * Centre, not top — targeting the top put the pair's actual middle at 0.4 plus
 * half a tile, which on a 667pt screen landed it straight through the headline.
 * The copy block runs roughly 210pt tall above a 120pt dock clearance, so on the
 * shortest shipping viewport the stage begins near 0.50; 0.30 keeps the whole
 * subject clear of it with room for a larger text size.
 */
const SUBJECT_AT = 0.3;

/** The subject comes forward. At 1.0 it read as two odd tiles, not a subject. */
const SUBJECT_SCALE = 1.5;

/** Haze on the furthest band, easing to none at the front. */
const HAZE_MAX = 0.55;
const HAZE_STEP = 0.085;

export interface Band {
  /** Tile edge length in points. */
  size: number;
  /** Tiles across — deliberately one more than fits, so both ends crop off
   *  screen and the row never shows a start or an end. */
  count: number;
  /** Distance from the top of the screen to the top of this band. */
  top: number;
  /** Canvas-coloured overlay alpha standing in for distance. */
  haze: number;
}

export interface RoomLayout {
  bands: Band[];
  /** Total tiles — the number that matters for mount cost. */
  total: number;
  /** Index into `bands` of the row the subject pair belongs to. */
  subjectBand: number;
  /** Edge length of each of the two subject tiles. */
  subjectSize: number;
  /** Distance from the top of the screen to the top of the subject pair. */
  subjectTop: number;
}

const EMPTY: RoomLayout = {
  bands: [],
  total: 0,
  subjectBand: 0,
  subjectSize: 0,
  subjectTop: 0,
};

/**
 * Lay out the room for a given viewport.
 *
 * Deterministic: same viewport, same room. The screen must not reshuffle
 * between renders — art that moves under you reads as a glitch.
 */
export function buildRoom(width: number, height: number): RoomLayout {
  if (!(width > 0) || !(height > 0)) return EMPTY;

  const bands: Band[] = [];
  const floor = height * FLOOR;
  let size = Math.max(MIN_BACK_SIZE, Math.round(width * BACK_FRACTION));
  let top = 0;
  let i = 0;

  // `top <= floor` rather than `<`: a band starting exactly on the line still
  // has most of its height above it.
  while (top <= floor && bands.length < 24) {
    bands.push({
      size,
      count: Math.ceil(width / (size + GAP)) + 1,
      top,
      haze: Math.max(0, HAZE_MAX - i * HAZE_STEP),
    });
    top += size + GAP;
    size = Math.round(size * GROWTH);
    i += 1;
  }

  if (!bands.length) return EMPTY;

  // The band whose CENTRE lands nearest the subject line. Nearest rather than
  // first-past-the-post, because bands get tall quickly at the front and
  // rounding either way moves the subject a third of a screen.
  const target = height * SUBJECT_AT;
  const centreOf = (b: Band) => b.top + b.size / 2;
  let subjectBand = 0;
  for (let b = 1; b < bands.length; b++) {
    if (Math.abs(centreOf(bands[b]) - target) < Math.abs(centreOf(bands[subjectBand]) - target)) {
      subjectBand = b;
    }
  }

  const host = bands[subjectBand];
  const subjectSize = Math.round(host.size * SUBJECT_SCALE);

  return {
    bands,
    total: bands.reduce((sum, b) => sum + b.count, 0),
    subjectBand,
    subjectSize,
    // Centred on its band rather than sharing its top edge, so growing forward
    // reads as coming toward the camera instead of dropping down the screen.
    subjectTop: host.top - (subjectSize - host.size) / 2,
  };
}
