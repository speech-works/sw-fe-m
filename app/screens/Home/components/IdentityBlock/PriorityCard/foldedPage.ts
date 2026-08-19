/**
 * ============================================================================
 * THE DOG-EARED PAGE
 * ----------------------------------------------------------------------------
 * The front page in the folder has its top-right corner turned down. These are
 * the four paths that draw it.
 *
 * ── WHY THIS IS SVG AND NOT VIEWS ───────────────────────────────────────────
 * The first version drew a triangle on top of the page, and it read as a sticker
 * rather than a fold. A fold is believable only when three things are true at
 * once, and a `View` can deliver none of the first:
 *
 *   1. the corner is GENUINELY GONE, so whatever is behind the page shows
 *      through the hole
 *   2. the flap shows the paper's REVERSE, which is lighter than the printed
 *      face because paper is white underneath
 *   3. there is one soft shadow where the flap lifts off the page
 *
 * React Native has no `clip-path`, and a coloured triangle painted over the
 * corner is not a hole: it has to guess what is behind it. Behind this corner is
 * sometimes the folder panel and sometimes the NEXT queued card, so any guess is
 * wrong half the time. Real transparency is the only honest answer, and that
 * means a path.
 *
 * ── THE MOUNT HAS TO BE CUT TOO, AND THIS WAS THE ACTUAL BUG ────────────────
 * Each page is a coloured sheet inside a white mount (`T` below). The first fold
 * cut only the colour, so the white mount kept drawing a corner that the fold
 * said was missing. The sheet claimed to be cut and whole at the same time, and
 * no amount of shadow tuning fixes a contradiction.
 *
 * So the chamfer runs through the mount and the fill together, and the mount
 * then FOLDS OVER: it reappears along the flap's two outer edges, because those
 * two edges are the sheet's real edges seen from the back. It is absent along
 * the crease, because a crease is not an edge. That asymmetry is the single
 * detail that makes this read as folded paper instead of a cut triangle.
 * ============================================================================
 */

/** The page's outer corner radius. Matches the mount that used to be a `View`. */
const R = 10;

/**
 * The white mount's thickness.
 *
 * 2.5 reads as a paper mount at this size; at 2 it is a hairline and at 3 it
 * starts to look like a border. Unchanged from the `View` version on purpose:
 * the fold is the only thing changing here.
 */
export const T = 2.5;

/** The fill's radius, a true parallel offset of the outer one. */
const RI = R - T;

/**
 * The fold's size: the length of each leg of the removed corner, in points.
 *
 * 14 against the page's 53pt height is the same proportion the browser mockup
 * used at its own scale. Larger and it eats the page; smaller and it stops
 * reading as paper and becomes a notch.
 */
export const FOLD = 14;

/** How far the flap's tip is rounded. This is the "curled, not creased" look. */
const CURL = 4.5;

/**
 * How far the flap's shadow is thrown, in points.
 *
 * Down and to the LEFT, which is away from the crease. This was wrong in the
 * first pass and it is worth naming: the shadow does not belong along the
 * crease, because that is the one edge where the paper is still attached and
 * touching the page. It belongs along the flap's two FREE edges, the ones that
 * lifted. Putting it on the crease darkens the hinge and lifts nothing.
 */
const LIFT = 1.2;

/**
 * Below this width the fold is not drawn at all.
 *
 * The chamfer eats into the top edge, and the top edge also has to hold two
 * corner radii. If a phone ever makes the slot narrow enough that those overlap,
 * the path inverts and draws a bow tie. Falling back to a plain page is a much
 * better failure than that.
 */
export const MIN_FOLDABLE_WIDTH = FOLD + 2 * R + 4;

const n = (v: number): number => Math.round(v * 100) / 100;

/**
 * The sheet: a rounded rectangle whose top-right corner is chamfered away.
 *
 * The top-right radius is simply gone rather than reduced. That corner does not
 * exist any more, so rounding it would be rounding nothing.
 */
export const sheetPath = (w: number, h: number): string =>
  [
    `M${R},0`,
    `H${n(w - FOLD)}`,
    `L${n(w)},${n(FOLD)}`,
    `V${n(h - R)}`,
    `A${R},${R} 0 0 1 ${n(w - R)},${n(h)}`,
    `H${R}`,
    `A${R},${R} 0 0 1 0,${n(h - R)}`,
    `V${R}`,
    `A${R},${R} 0 0 1 ${R},0`,
    "Z",
  ].join(" ");

/**
 * The coloured fill, inset from the sheet by the mount on every side INCLUDING
 * the cut.
 *
 * The cut is the only inset that is not simply `T`. Offsetting a 45 degree line
 * square to itself by `T` moves it by `T * sqrt(2)` along both axes, so the two
 * ends of the inner cut land at `T * sqrt(2)` back from where a naive `T` would
 * put them. Get this wrong and the mount is visibly fatter along the diagonal
 * than along the straight edges, which is exactly the tell that says "drawn"
 * rather than "cut".
 */
export const fillPath = (w: number, h: number): string => {
  const d = T * Math.SQRT2;
  const xc = w - FOLD + T - d; // where the inner cut meets the inner top edge
  const yc = FOLD - T + d; // where it meets the inner right edge

  return [
    `M${n(T + RI)},${T}`,
    `H${n(xc)}`,
    `L${n(w - T)},${n(yc)}`,
    `V${n(h - T - RI)}`,
    `A${RI},${RI} 0 0 1 ${n(w - T - RI)},${n(h - T)}`,
    `H${n(T + RI)}`,
    `A${RI},${RI} 0 0 1 ${T},${n(h - T - RI)}`,
    `V${n(T + RI)}`,
    `A${RI},${RI} 0 0 1 ${n(T + RI)},${T}`,
    "Z",
  ].join(" ");
};

/**
 * The flap: the removed corner, mirrored across the crease.
 *
 * Reflecting the corner point (w, 0) across the crease lands it at
 * (w - FOLD, FOLD), which is why the flap is the same size as the hole and
 * points the other way. This is drawn in the MOUNT colour; `flapFillPath` puts
 * the reverse of the paper on top of it and leaves the mount showing along the
 * two edges that were real edges before the fold.
 */
export const flapPath = (w: number, dx = 0, dy = 0): string =>
  [
    `M${n(w - FOLD + dx)},${n(dy)}`,
    `L${n(w + dx)},${n(FOLD + dy)}`,
    `L${n(w - FOLD + CURL + dx)},${n(FOLD + dy)}`,
    `A${CURL},${CURL} 0 0 1 ${n(w - FOLD + dx)},${n(FOLD - CURL + dy)}`,
    "Z",
  ].join(" ");

/**
 * The same flap, thrown down and left, to be drawn UNDER it in a translucent
 * black.
 *
 * A hard offset rather than a blur on purpose. `LIFT` is about one point, and
 * react-native-svg's blur filters are the one part of that library with a
 * history of behaving differently on Android. A one point blur is invisible at
 * this size, so the blur would be all risk and no gain.
 *
 * Every corner of this stays inside the sheet, so it needs no clipping: the
 * offset moves it away from the two cut edges, never past them.
 */
export const flapShadowPath = (w: number): string => flapPath(w, -LIFT, LIFT);

/**
 * The reverse of the paper, inset from the flap's two OUTER edges only.
 *
 * Its long edge sits exactly on the crease, so no mount is drawn there. That is
 * the whole point: paper folded over shows its border on the edges that were
 * edges, and nothing along the fold itself.
 */
export const flapFillPath = (w: number): string => {
  const ci = Math.max(CURL - T, 0);

  return [
    `M${n(w - FOLD + T)},${T}`,
    `L${n(w - T)},${n(FOLD - T)}`,
    `L${n(w - FOLD + T + ci)},${n(FOLD - T)}`,
    `A${n(ci)},${n(ci)} 0 0 1 ${n(w - FOLD + T)},${n(FOLD - T - ci)}`,
    "Z",
  ].join(" ");
};
