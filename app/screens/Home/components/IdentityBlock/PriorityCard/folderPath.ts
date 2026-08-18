import { radius } from "../../../../../design-system";

/**
 * ============================================================================
 * THE FOLDER SILHOUETTE
 * ----------------------------------------------------------------------------
 * Two paths that together draw ONE object: a back panel carrying the tab, and a
 * front face over its lower part. Whatever is queued sits BETWEEN them, which is
 * the only place "in the folder" can actually mean anything.
 *
 * ── WHY THIS IS BUILT AT THE MEASURED WIDTH, NOT STRETCHED ──────────────────
 * The obvious version is one fixed viewBox with `preserveAspectRatio="none"`.
 * That is what the browser preview did, and at 375pt it happened to be exact.
 * On any wider phone it is not: the slot is 163.5pt on an iPhone SE and 191pt on
 * a Pro Max, so a fixed box would be stretched 1.17x horizontally and every
 * corner would turn into an ellipse while the avatar card beside it kept perfect
 * circles. Only the straight runs depend on width, so building the path from the
 * measured size costs one `onLayout` and keeps the corners round.
 *
 * ── WHY THE CORNERS ARE `radius.card` ───────────────────────────────────────
 * The two halves of the identity row are one visual grammar. The macOS folder
 * this came from has a tighter corner than our cards do, and reproducing that
 * literally put a 14pt corner next to a 24pt one in the same row, which reads as
 * a mistake rather than as a folder. The tab is what makes it a folder; the
 * corner radius is what makes it ours.
 * ============================================================================
 */

/** The outer corner. Matches the avatar card beside it exactly. */
const R = radius.card;

/** The front face's own top corners. Interior, so free to be tighter. */
const RT = 12;

/**
 * How far the tab rises above the front face, in points.
 *
 * Two numbers, not one. `TAB_TOP` is the top of the whole object; `FACE_TOP` is
 * where the front face starts and therefore where "inside" stops being visible.
 * The 36pt band between them is the entire content budget for the peek.
 */
export const FACE_TOP = 36;

/** Where the tab's own top edge levels off onto the back panel's shoulder. */
const TAB_SHOULDER = 15;

/**
 * The back panel: the whole silhouette, tab included.
 *
 * ONE path, deliberately. An earlier attempt drew the tab as its own view with a
 * cut corner in a different surface colour, and it read as a rendering glitch
 * rather than as a folder: three materials in one object. A folder is one
 * material at two depths, so the tab can never be a separate thing.
 */
export const backPath = (w: number, h: number): string =>
  [
    `M${R},0`,
    // The tab's flat top, then a shallow S down onto the shoulder.
    `H56`,
    `C63,0 64.5,4 67,8`,
    `C69.5,12 71,15 78,${TAB_SHOULDER}`,
    `H${w - R}`,
    `A${R},${R} 0 0 1 ${w},${TAB_SHOULDER + R}`,
    `V${h - R}`,
    `A${R},${R} 0 0 1 ${w - R},${h}`,
    `H${R}`,
    `A${R},${R} 0 0 1 0,${h - R}`,
    `V${R}`,
    `A${R},${R} 0 0 1 ${R},0`,
    "Z",
  ].join(" ");

/**
 * The front face.
 *
 * Its BOTTOM corners are `R`, not its own top radius, so its outline lands
 * exactly on the back panel's. Give it a tighter bottom radius and it pokes
 * outside the silhouette by about half a point at each bottom corner, which at
 * this size looks like the card is chipped rather than layered.
 */
export const frontPath = (w: number, h: number, top = FACE_TOP): string =>
  [
    `M${RT},${top}`,
    `H${w - RT}`,
    `A${RT},${RT} 0 0 1 ${w},${top + RT}`,
    `V${h - R}`,
    `A${R},${R} 0 0 1 ${w - R},${h}`,
    `H${R}`,
    `A${R},${R} 0 0 1 0,${h - R}`,
    `V${top + RT}`,
    `A${RT},${RT} 0 0 1 ${RT},${top}`,
    "Z",
  ].join(" ");
