import React from "react";
import { Defs, Mask, Path } from "react-native-svg";
import { TILE, HEAD } from "../sw-faces/faceKit";

/**
 * Shared geometry for the avatar system. Everything renders in the brand's
 * 48-unit space (TILE = the housing circle r24 at 24,24; HEAD = the squircle
 * head plate) inside a `viewBox="-8 -8 64 64"` — the 8-unit bleed is where
 * props live (a camera beside the chin, the summit flag past the tile edge).
 *
 * Measured head contour (numerically derived during the icon-fitting work —
 * the bezier overshoots, NOT the nominal path box):
 *   centre x = 24.675 · crown y = 8 · forehead span x 6.24→43.11 at y=20 ·
 *   ear-height span x 6.07→43.27 at y=24.
 */
export { TILE, HEAD };

export const CX = 24.675;

/** Darken/lighten a #RRGGBB by a factor (-1..1). Asset-internal color math. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const GOLD = "#FFC53D";

/**
 * The avatar's ink — the uniform outline on every shape, Snoo-style. Reddit's
 * builder rule, adopted as ours: users recolor FILLS, never strokes. The one
 * fixed line color is what makes mixed wardrobe pieces read as one character.
 */
export const INK = "#241F26";

/**
 * Static defs shared by every avatar instance. Ids are `av-` namespaced so
 * they can never collide with faceKit's `volume`/`circ`/`head` when an avatar
 * and a mood face render on the same screen. (Precedent: multiple FaceShell
 * Svgs already share static ids across roots in production.)
 *
 * Snoo-adapted style: NO gradients anywhere — every shape is a flat fill plus
 * the shared `INK` outline. The defs are just the two masks.
 */
export const AvatarDefs: React.FC = () => (
  <Defs>
    <Mask id="av-circ" maskUnits="userSpaceOnUse" x={-8} y={-8} width={64} height={64}>
      <Path fill="#fff" d={TILE} />
    </Mask>
    {/* The head silhouette as a mask. Hair is drawn as a big filled shape and
        clipped to this — so the hairline is the only edge that needs sculpting,
        and the head's contour is followed perfectly (the studio hair idiom). */}
    <Mask id="av-head" maskUnits="userSpaceOnUse" x={0} y={0} width={48} height={48}>
      <Path fill="#fff" d={HEAD} />
    </Mask>
  </Defs>
);
