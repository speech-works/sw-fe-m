/**
 * Fit a moment to the real screen. Each moment was designed on one of the lab's screens (390 x 844 points), with Pip at a set
 * spot (`FxSpot`: his picture's top-left and width). On a real screen Pip stands somewhere a little different (another phone
 * size, a taller header), so the props he acts with would land beside him, not on him.
 *
 * fitFx moves every prop that belongs to Pip with him: it maps the design point around his centre to the same point around
 * his real centre, scaled by his real size (g = real px per design point). Sizes, track offsets, sway and speeds scale too.
 * What belongs to the SCREEN stays where it was designed, as a share of the screen: rain and twinkle fields that cross most
 * of the screen, things fired from the screen's side edges (confetti cannons), fireworks in the sky (trails rising from the
 * top area and bursts in the top quarter), and props placed far from him (more than FAR x his width away: they act on a
 * button or a card of the screen, e.g. the note that jumps out of "Done"). Pure: no React, testable.
 */
import type { FxEffect, FxEmitter, FxKey } from "./types";

/** Pip's spot in the design (390 x 844 points): his picture's top-left and its width. */
export type FxSpot = { x: number; y: number; size: number };
/** Pip's real place: his centre (the stage's origin) in px inside the screen, and his width in px; the screen in px. */
export type FxPlace = { cx: number; cy: number; size: number; W: number; H: number };

export const DESIGN_W = 390, DESIGN_H = 844;
/** Where the stage puts the effects' origin in Pip's picture (PipStage: his top + 0.42 of his height). */
const ORIGIN_Y = 0.42;
const PIC_H = 322 / 372;

export const spotCentre = (s: FxSpot): [number, number] => [s.x + s.size / 2, s.y + s.size * PIC_H * ORIGIN_Y];

/** A prop placed further than this many of Pip's widths from his centre belongs to the screen. */
export const FAR = 2.2;

/** Does this emitter belong to the screen (stays put) rather than to Pip (moves with him)? `design`: Pip's design spot. */
export function screenAnchored(e: FxEmitter, design?: FxSpot): boolean {
  const a = e.area, o = e.origin;
  if (design) {
    const [cx, cy] = spotCentre(design), p = o ?? (a ? [(a[0] + a[2]) / 2, (a[1] + a[3]) / 2] : null);
    if (p && Math.hypot(p[0] * DESIGN_W - cx, p[1] * DESIGN_H - cy) > FAR * design.size) return true;
  }
  if (a && Math.abs(a[2] - a[0]) > 0.5) return true;                      // a field across the screen (rain, twinkle)
  if (o && (o[0] < 0.04 || o[0] > 0.96)) return true;                     // fired from a side edge (cannons)
  if (e.kind === "rise" && a && Math.min(a[1], a[3]) < 0.03) return true; // a firework's trail, rising into the top
  if (e.kind === "burst" && o && o[1] < 0.25) return true;                // a burst in the sky
  return false;
}

/** The effect fitted to Pip's real place. Returns the same object when nothing would change (same spot, same size). */
export function fitFx(effect: FxEffect, design: FxSpot, real: FxPlace): FxEffect {
  const [dx, dy] = spotCentre(design);
  const g = real.size / design.size;
  const kx = (DESIGN_W * g) / real.W, ky = (DESIGN_H * g) / real.H;   // design fraction of width / height -> real fraction
  // nothing to do: the real spot is the design spot as a share of a 390 x 844 screen
  const same = Math.abs(real.cx / real.W - dx / DESIGN_W) < 0.002 && Math.abs(real.cy / real.H - dy / DESIGN_H) < 0.002 && Math.abs(kx - 1) < 0.002 && Math.abs(ky - 1) < 0.002;
  if (same) return effect;
  const pt = (p: [number, number]): [number, number] => [(real.cx + (p[0] * DESIGN_W - dx) * g) / real.W, (real.cy + (p[1] * DESIGN_H - dy) * g) / real.H];
  const sc = (r: [number, number] | undefined, k: number): [number, number] | undefined => (r ? [r[0] * k, r[1] * k] : r);
  const emitters = effect.emitters.map((e): FxEmitter => {
    if (screenAnchored(e, design)) return e;
    const out: FxEmitter = { ...e, size: sc(e.size, kx), radius: sc(e.radius, kx), speed: sc(e.speed, ky) };
    if (e.origin) out.origin = pt(e.origin);
    if (e.area) { const p0 = pt([e.area[0], e.area[1]]), p1 = pt([e.area[2], e.area[3]]); out.area = [p0[0], p0[1], p1[0], p1[1]]; }
    if (e.gravity != null) out.gravity = e.gravity * ky;
    if (e.sway != null) out.sway = e.sway * kx;
    if (e.keys) out.keys = e.keys.map((k): FxKey => ({ ...k, ...(k.x != null ? { x: k.x * kx } : {}), ...(k.y != null ? { y: k.y * kx } : {}) }));
    // an emitter with no origin starts at Pip's centre already (the stage's origin): only its sizes change
    return out;
  });
  return { ...effect, emitters };
}
